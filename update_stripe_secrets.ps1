$stripeSecretKey = Read-Host -Prompt "Enter your Stripe Secret Key (sk_test_...)"
$stripePublishableKey = Read-Host -Prompt "Enter your Stripe Publishable Key (pk_test_...)"

if ([string]::IsNullOrWhiteSpace($stripeSecretKey) -or [string]::IsNullOrWhiteSpace($stripePublishableKey)) {
    Write-Host "Error: Keys cannot be empty." -ForegroundColor Red
    exit 1
}

Write-Host "Setting Supabase secrets..." -ForegroundColor Yellow
npx supabase secrets set STRIPE_SECRET_KEY=$stripeSecretKey STRIPE_PUBLISHABLE_KEY=$stripePublishableKey

Write-Host "Secrets updated successfully!" -ForegroundColor Green
Write-Host "Please restart your local dev server if running locally." -ForegroundColor Cyan
