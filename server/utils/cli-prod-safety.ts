/**
 * Production write commands must pass both `--prod` and `--confirm-prod`.
 * Never allow `--prod` alone to perform a silent write.
 */
export function assertProdWriteAllowed(options: {
  prod?: boolean
  confirmProd?: boolean
  dryRun?: boolean
}): void {
  if (!options.prod) return
  if (options.dryRun) return
  if (options.confirmProd) return

  console.error(
    'Production writes require --prod and --confirm-prod. Use --dry-run to preview without writing.'
  )
  process.exit(1)
}
