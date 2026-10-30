/**
 * Prints the current page with only `.print-area` content visible.
 * Used for bills/invoices so the floating chat widget, header, footer and
 * toasts never appear in the PDF produced by the browser's print dialog.
 */
export function printBill(): void {
  document.body.classList.add('printing-bill');

  const cleanup = (): void => {
    document.body.classList.remove('printing-bill');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  // Safari and some embedded viewers skip afterprint — force cleanup.
  window.setTimeout(cleanup, 3000);
  window.print();
}
