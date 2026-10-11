$ErrorActionPreference = "Stop"
$base = "http://localhost:3111"
$pass = 0; $fail = 0

function Check($name, $cond, $extra = "") {
  if ($cond) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
  else { Write-Host "  FAIL  $name  $extra" -ForegroundColor Red; $script:fail++ }
}

function Json($resp) { return ($resp.Content | ConvertFrom-Json) }
function AllSlots { return (Json (Invoke-WebRequest "$base/api/v1/slots?openOnly=true&pageSize=100" -UseBasicParsing)).data }

Write-Host "`n== Public reads ==" -ForegroundColor Cyan
$meta = Invoke-WebRequest "$base/api/v1/meta" -UseBasicParsing
Check "GET /api/v1/meta -> 200" ($meta.StatusCode -eq 200)
Check "meta reports X-App-Version" ($meta.Headers['X-App-Version'] -eq '1.0.0')

$pkgs = Json (Invoke-WebRequest "$base/api/v1/packages" -UseBasicParsing)
Check "GET /api/v1/packages returns >=4" ($pkgs.data.Count -ge 4) "got $($pkgs.data.Count)"
Check "packages response has pagination meta" ($null -ne $pkgs.meta.total)

$addons = Json (Invoke-WebRequest "$base/api/v1/addons" -UseBasicParsing)
Check "GET /api/v1/addons returns 6" ($addons.data.Count -eq 6) "got $($addons.data.Count)"

$slots = AllSlots
Check "GET /api/v1/slots returns slots" ($slots.Count -gt 0)
Check "slots expose seatsRemaining" ($null -ne $slots[0].seatsRemaining)

Write-Host "`n== Anonymous access control ==" -ForegroundColor Cyan
try {
  Invoke-WebRequest "$base/api/v1/reservations" -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "GET /api/v1/reservations anon -> 401" $false
} catch {
  Check "GET /api/v1/reservations anon -> 401" ($_.Exception.Response.StatusCode.value__ -eq 401) "got $($_.Exception.Response.StatusCode.value__)"
}
try {
  Invoke-WebRequest "$base/api/v1/users" -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "GET /api/v1/users anon -> 401" $false
} catch {
  Check "GET /api/v1/users anon -> 401" ($_.Exception.Response.StatusCode.value__ -eq 401)
}
$acct = Invoke-WebRequest "$base/account" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
Check "/account anon -> redirect" ($acct.StatusCode -in @(302,307)) "got $($acct.StatusCode)"

Write-Host "`n== Customer login + booking ==" -ForegroundColor Cyan
$cust = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$body = @{ email = "customer@grillcorn.test"; password = "Customer!2345" } | ConvertTo-Json
$login = Json (Invoke-WebRequest "$base/api/v1/auth/login" -Method POST -Body $body -ContentType "application/json" -WebSession $cust -UseBasicParsing)
Check "customer login -> 200" ($login.data.user.role -eq "CUSTOMER")

$me = Json (Invoke-WebRequest "$base/api/v1/auth/me" -WebSession $cust -UseBasicParsing)
Check "GET /auth/me returns the customer" ($me.data.user.email -eq "customer@grillcorn.test")

$pkg = $pkgs.data | Where-Object { $_.minGuests -le 20 -and $_.maxGuests -ge 20 } | Select-Object -First 1
$addon = $addons.data | Select-Object -First 1
$freeSlot = $slots | Where-Object { $_.seatsRemaining -ge 20 } | Select-Object -First 1
Check "found a slot with >=20 seats free" ($null -ne $freeSlot)

$resBody = @{
  slotId = $freeSlot.id; packageId = $pkg.id; partySize = 20
  fulfillment = "DELIVERY"
  addressLine1 = "2100 Mission St"; city = "San Francisco"; state = "CA"; postalCode = "94110"
  notes = "Smoke test booking"
  addOns = @(@{ addonId = $addon.id; quantity = 1 })
} | ConvertTo-Json -Depth 5
$res = Json (Invoke-WebRequest "$base/api/v1/reservations" -Method POST -Body $resBody -ContentType "application/json" -WebSession $cust -UseBasicParsing)
Check "POST /api/v1/reservations -> created" ($null -ne $res.data.id)
$resId = $res.data.id
$expected = ($pkg.pricePerHead * 20) + $addon.priceCents + 2500
Check "total = package + addon + delivery fee" ($res.data.totalCents -eq $expected) "expected $expected got $($res.data.totalCents)"
Check "reservation code assigned" ($res.data.code -like "GC-*")

$after = (AllSlots) | Where-Object { $_.id -eq $freeSlot.id } | Select-Object -First 1
Check "slot seatsUsed incremented by 20" ($after.seatsUsed -eq ($freeSlot.seatsUsed + 20)) "before $($freeSlot.seatsUsed) after $($after.seatsUsed)"

try {
  Invoke-WebRequest "$base/api/v1/reservations" -Method POST -Body (@{ slotId = $freeSlot.id; packageId = $pkg.id; partySize = 20; fulfillment = "DELIVERY" } | ConvertTo-Json) -ContentType "application/json" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "DELIVERY without address -> 422" $false
} catch {
  Check "DELIVERY without address -> 422" ($_.Exception.Response.StatusCode.value__ -eq 422) "got $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n== Customer is not admin ==" -ForegroundColor Cyan
try {
  Invoke-WebRequest "$base/api/v1/users" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "customer GET /api/v1/users -> 403" $false
} catch {
  Check "customer GET /api/v1/users -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403) "got $($_.Exception.Response.StatusCode.value__)"
}
try {
  Invoke-WebRequest "$base/api/v1/packages" -Method POST -Body "{}" -ContentType "application/json" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "customer POST /api/v1/packages -> 403" $false
} catch {
  Check "customer POST /api/v1/packages -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403) "got $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n== Customer cancel releases seats ==" -ForegroundColor Cyan
$cancelled = Json (Invoke-WebRequest "$base/api/v1/reservations/$resId/status" -Method PATCH -Body (@{ status = "CANCELLED"; note = "Smoke test cancel" } | ConvertTo-Json) -ContentType "application/json" -WebSession $cust -UseBasicParsing)
Check "customer PATCH status -> CANCELLED" ($cancelled.data.status -eq "CANCELLED")
$after2 = (AllSlots) | Where-Object { $_.id -eq $freeSlot.id } | Select-Object -First 1
Check "seats released back after cancel" ($after2.seatsUsed -eq $freeSlot.seatsUsed) "expected $($freeSlot.seatsUsed) got $($after2.seatsUsed)"

try {
  Invoke-WebRequest "$base/api/v1/reservations/$resId/status" -Method PATCH -Body '{"status":"COMPLETED"}' -ContentType "application/json" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "customer cannot set COMPLETED -> 403" $false
} catch {
  Check "customer cannot set COMPLETED -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403) "got $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n== Staff workflow ==" -ForegroundColor Cyan
$staff = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$staffLogin = Json (Invoke-WebRequest "$base/api/v1/auth/login" -Method POST -Body (@{ email = "staff@grillcorn.test"; password = "Staff!2345" } | ConvertTo-Json) -ContentType "application/json" -WebSession $staff -UseBasicParsing)
Check "staff login -> 200" ($staffLogin.data.user.role -eq "STAFF")

$allRes = Json (Invoke-WebRequest "$base/api/v1/reservations" -WebSession $staff -UseBasicParsing)
Check "staff sees all reservations" ($allRes.meta.scope -eq "all")
Check "staff sees >1 reservation" ($allRes.data.Count -ge 5) "got $($allRes.data.Count)"

try {
  Invoke-WebRequest "$base/api/v1/users" -WebSession $staff -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "staff GET /api/v1/users -> 403" $false
} catch {
  Check "staff GET /api/v1/users -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403)
}

# Fixtures created by this run, so the test never depends on seeded rows an
# earlier run already advanced. Slots are chosen with headroom because repeated
# runs consume seats.
$avail = AllSlots
$wfSlot = $avail | Where-Object { $_.seatsRemaining -ge 40 } | Select-Object -First 1
if (-not $wfSlot) { $wfSlot = $avail | Sort-Object seatsRemaining -Descending | Select-Object -First 1 }
$wf = Json (Invoke-WebRequest "$base/api/v1/reservations" -Method POST -Body (@{ slotId = $wfSlot.id; packageId = $pkg.id; partySize = 15; fulfillment = "PICKUP"; addOns = @() } | ConvertTo-Json -Depth 5) -ContentType "application/json" -WebSession $cust -UseBasicParsing)
$wfId = $wf.data.id
Check "workflow fixture created in PENDING" ($wf.data.status -eq "PENDING")

$conf = Json (Invoke-WebRequest "$base/api/v1/reservations/$wfId/status" -Method PATCH -Body '{"status":"CONFIRMED","note":"smoke"}' -ContentType "application/json" -WebSession $staff -UseBasicParsing)
Check "staff PENDING -> CONFIRMED" ($conf.data.status -eq "CONFIRMED")
$prep = Json (Invoke-WebRequest "$base/api/v1/reservations/$wfId/status" -Method PATCH -Body '{"status":"PREPARING"}' -ContentType "application/json" -WebSession $staff -UseBasicParsing)
Check "staff CONFIRMED -> PREPARING" ($prep.data.status -eq "PREPARING")
$done = Json (Invoke-WebRequest "$base/api/v1/reservations/$wfId/status" -Method PATCH -Body '{"status":"COMPLETED"}' -ContentType "application/json" -WebSession $staff -UseBasicParsing)
Check "staff PREPARING -> COMPLETED" ($done.data.status -eq "COMPLETED")

$hist = Json (Invoke-WebRequest "$base/api/v1/reservations/$wfId/status" -WebSession $staff -UseBasicParsing)
Check "status history recorded 4 transitions" ($hist.data.Count -ge 4) "got $($hist.data.Count)"

try {
  Invoke-WebRequest "$base/api/v1/reservations/$wfId/status" -Method PATCH -Body '{"status":"PREPARING"}' -ContentType "application/json" -WebSession $staff -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "COMPLETED is terminal -> 422" $false
} catch {
  Check "COMPLETED is terminal -> 422" ($_.Exception.Response.StatusCode.value__ -eq 422) "got $($_.Exception.Response.StatusCode.value__)"
}

$wfSlot2 = (AllSlots) | Where-Object { $_.seatsRemaining -ge 15 -and $_.id -ne $wfSlot.id } | Select-Object -First 1
if (-not $wfSlot2) { $wfSlot2 = $wfSlot }
$wf2 = Json (Invoke-WebRequest "$base/api/v1/reservations" -Method POST -Body (@{ slotId = $wfSlot2.id; packageId = $pkg.id; partySize = 15; fulfillment = "PICKUP"; addOns = @() } | ConvertTo-Json -Depth 5) -ContentType "application/json" -WebSession $cust -UseBasicParsing)
try {
  Invoke-WebRequest "$base/api/v1/reservations/$($wf2.data.id)/status" -Method PATCH -Body '{"status":"COMPLETED"}' -ContentType "application/json" -WebSession $staff -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "PENDING -> COMPLETED rejected -> 422" $false
} catch {
  Check "PENDING -> COMPLETED rejected -> 422" ($_.Exception.Response.StatusCode.value__ -eq 422) "got $($_.Exception.Response.StatusCode.value__)"
}

$other = $allRes.data | Where-Object { $_.userId -ne $login.data.user.id } | Select-Object -First 1
if ($other) {
  try {
    Invoke-WebRequest "$base/api/v1/reservations/$($other.id)" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
    Check "customer reading another order -> 404" $false
  } catch {
    Check "customer reading another order -> 404" ($_.Exception.Response.StatusCode.value__ -eq 404) "got $($_.Exception.Response.StatusCode.value__)"
  }
}

Write-Host "`n== Admin CRUD ==" -ForegroundColor Cyan
$admin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest "$base/api/v1/auth/login" -Method POST -Body (@{ email = "admin@grillcorn.test"; password = "Admin!2345" } | ConvertTo-Json) -ContentType "application/json" -WebSession $admin -UseBasicParsing | Out-Null

$users = Json (Invoke-WebRequest "$base/api/v1/users" -WebSession $admin -UseBasicParsing)
Check "admin lists users" ($users.data.Count -ge 4) "got $($users.data.Count)"
Check "user payloads hide passwordHash" ($null -eq $users.data[0].passwordHash)

$slug = "smoke-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$newPkg = @{
  name = "Smoke Test Package"; slug = $slug; tagline = "Temporary"
  description = "Created by the smoke test to verify create, update and delete."
  pricePerHead = 1000; minGuests = 10; maxGuests = 50; active = $true; sortOrder = 99
} | ConvertTo-Json
$created = Json (Invoke-WebRequest "$base/api/v1/packages" -Method POST -Body $newPkg -ContentType "application/json" -WebSession $admin -UseBasicParsing)
Check "admin creates package" ($created.data.slug -eq $slug)
$pkgId = $created.data.id

$patched = Json (Invoke-WebRequest "$base/api/v1/packages/$pkgId" -Method PATCH -Body (@{ pricePerHead = 1200 } | ConvertTo-Json) -ContentType "application/json" -WebSession $admin -UseBasicParsing)
Check "admin updates package price" ($patched.data.pricePerHead -eq 1200)
Check "PATCH preserved untouched fields" ($patched.data.maxGuests -eq 50 -and $patched.data.name -eq "Smoke Test Package")

try {
  Invoke-WebRequest "$base/api/v1/packages/$pkgId" -Method PATCH -Body (@{ minGuests = 100 } | ConvertTo-Json) -ContentType "application/json" -WebSession $admin -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "PATCH minGuests>maxGuests -> 422" $false
} catch {
  Check "PATCH minGuests>maxGuests -> 422" ($_.Exception.Response.StatusCode.value__ -eq 422) "got $($_.Exception.Response.StatusCode.value__)"
}

try {
  Invoke-WebRequest "$base/api/v1/packages" -Method POST -Body '{"name":"x"}' -ContentType "application/json" -WebSession $admin -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "invalid package -> 422" $false
} catch {
  Check "invalid package -> 422" ($_.Exception.Response.StatusCode.value__ -eq 422) "got $($_.Exception.Response.StatusCode.value__)"
}

try {
  Invoke-WebRequest "$base/api/v1/packages" -Method POST -Body $newPkg -ContentType "application/json" -WebSession $staff -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "staff POST package -> 403" $false
} catch {
  Check "staff POST package -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403)
}

$del = Json (Invoke-WebRequest "$base/api/v1/packages/$pkgId" -Method DELETE -WebSession $admin -UseBasicParsing)
Check "admin deletes package" ($del.data.deleted -eq $true)

$selfId = (Json (Invoke-WebRequest "$base/api/v1/auth/me" -WebSession $admin -UseBasicParsing)).data.user.id
try {
  Invoke-WebRequest "$base/api/v1/users/$selfId" -Method DELETE -WebSession $admin -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "admin cannot delete self -> 403" $false
} catch {
  Check "admin cannot delete self -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403) "got $($_.Exception.Response.StatusCode.value__)"
}
try {
  Invoke-WebRequest "$base/api/v1/users/$selfId" -Method PATCH -Body (@{ role = "CUSTOMER" } | ConvertTo-Json) -ContentType "application/json" -WebSession $admin -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "admin cannot self-demote -> 403" $false
} catch {
  Check "admin cannot self-demote -> 403" ($_.Exception.Response.StatusCode.value__ -eq 403) "got $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n== Public quote message ==" -ForegroundColor Cyan
$createdMsg = Json (Invoke-WebRequest "$base/api/v1/messages" -Method POST -Body (@{ name = "Smoke Tester"; email = "smoke@example.com"; message = "Testing the public quote endpoint end to end." } | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing)
Check "public POST /api/v1/messages -> created" ($null -ne $createdMsg.data.id)
$inbox = Json (Invoke-WebRequest "$base/api/v1/messages" -WebSession $admin -UseBasicParsing)
Check "admin can read the inbox" ($inbox.data.Count -ge 3) "got $($inbox.data.Count)"

$honey = Json (Invoke-WebRequest "$base/api/v1/messages" -Method POST -Body (@{ name = "Bot"; email = "bot@example.com"; message = "aaaaaaaaaaaaaaaaaaaa"; website = "http://spam" } | ConvertTo-Json) -ContentType "application/json" -UseBasicParsing)
Check "honeypot returns benign success" ($null -ne $honey.data.received)
$inbox2 = Json (Invoke-WebRequest "$base/api/v1/messages" -WebSession $admin -UseBasicParsing)
Check "honeypot stored nothing" ($inbox2.data.Count -eq $inbox.data.Count) "before $($inbox.data.Count) after $($inbox2.data.Count)"

Write-Host "`n== Pages render ==" -ForegroundColor Cyan
foreach ($p in @("/", "/menu", "/schedule", "/docs", "/changelog", "/login", "/register")) {
  try {
    $r = Invoke-WebRequest "$base$p" -UseBasicParsing -TimeoutSec 30
    Check "GET $p -> 200" ($r.StatusCode -eq 200) "got $($r.StatusCode)"
  } catch { Check "GET $p -> 200" $false $_.Exception.Message }
}
foreach ($p in @("/account", "/account/reservations", "/admin", "/admin/packages", "/admin/packages/new", "/admin/slots", "/admin/users", "/admin/addons", "/admin/messages", "/admin/reservations")) {
  try {
    $r = Invoke-WebRequest "$base$p" -WebSession $admin -UseBasicParsing -TimeoutSec 30
    Check "GET $p (admin) -> 200" ($r.StatusCode -eq 200) "got $($r.StatusCode)"
  } catch { Check "GET $p (admin) -> 200" $false $_.Exception.Message }
}
try {
  Invoke-WebRequest "$base/book" -WebSession $cust -UseBasicParsing -TimeoutSec 30 | Out-Null
  Check "GET /book (customer) -> 200" $true
} catch { Check "GET /book (customer) -> 200" $false $_.Exception.Message }

try {
  Invoke-WebRequest "$base/account/reservations/does-not-exist" -WebSession $admin -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "unknown reservation -> 404" $false
} catch {
  Check "unknown reservation -> 404" ($_.Exception.Response.StatusCode.value__ -eq 404) "got $($_.Exception.Response.StatusCode.value__)"
}

Write-Host "`n== Logout ==" -ForegroundColor Cyan
Invoke-WebRequest "$base/api/v1/auth/logout" -Method POST -WebSession $cust -UseBasicParsing | Out-Null
try {
  Invoke-WebRequest "$base/api/v1/reservations" -WebSession $cust -UseBasicParsing -ErrorAction Stop | Out-Null
  Check "after logout, reservations -> 401" $false
} catch {
  Check "after logout, reservations -> 401" ($_.Exception.Response.StatusCode.value__ -eq 401)
}

Write-Host "`n---------------------------------------"
Write-Host "  Passed: $pass   Failed: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "---------------------------------------`n"
exit $(if ($fail -eq 0) { 0 } else { 1 })
