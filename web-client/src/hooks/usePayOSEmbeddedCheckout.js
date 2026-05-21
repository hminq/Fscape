import { useEffect, useRef } from "react";
import { usePayOS } from "@payos/payos-checkout";

export function usePayOSEmbeddedCheckout({
  checkoutUrl,
  elementId,
  onSuccess,
  onCancel,
  returnUrl = `${window.location.origin}/payment/result`,
}) {
  const { open } = usePayOS({
    RETURN_URL: returnUrl,
    ELEMENT_ID: elementId,
    CHECKOUT_URL: checkoutUrl,
    embedded: true,
    onSuccess,
    onCancel,
  });

  const openedCheckoutUrl = useRef("");
  useEffect(() => {
    if (!checkoutUrl || openedCheckoutUrl.current === checkoutUrl) return;

    const container = document.getElementById(elementId);
    if (!container) return;

    if (container.dataset.payosCheckoutUrl === checkoutUrl && container.childElementCount > 0) {
      openedCheckoutUrl.current = checkoutUrl;
      return;
    }

    container.innerHTML = "";
    container.dataset.payosCheckoutUrl = checkoutUrl;
    openedCheckoutUrl.current = checkoutUrl;
    open();
  }, [checkoutUrl, elementId, open]);
}
