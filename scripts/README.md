# Application checks

This folder contains frontend verification scripts only. Run them from the
repository root with the local development server running:

```powershell
node scripts/check-service-switcher.cjs
node scripts/check-umrah.cjs
```

Agency data, images, and collection tools now live in
[agency_info](../agency_info/README.md). Collector outputs go to the system temporary
directory, not the repository. This folder contains app verification scripts only.
