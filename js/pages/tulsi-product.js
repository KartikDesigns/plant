// Quantity selector for product detail page
(function () {
  const minus = document.getElementById("qty-minus");
  const plus = document.getElementById("qty-plus");
  const value = document.getElementById("qty-value");
  if (!minus || !plus || !value) return;

  minus.addEventListener("click", function () {
    let qty = parseInt(value.textContent) || 1;
    if (qty > 1) {
      qty--;
      value.textContent = qty;
    }
  });

  plus.addEventListener("click", function () {
    let qty = parseInt(value.textContent) || 1;
    if (qty < 99) {
      qty++;
      value.textContent = qty;
    }
  });

  const addBtn = document.querySelector(".btn-whatsapp, .btn-add-cart");
  if (addBtn && addBtn.tagName === 'A') {
    // WhatsApp link — update href with quantity when clicked
    addBtn.addEventListener("click", function (e) {
      const qty = parseInt(value.textContent) || 1;
      const baseText = qty > 1 
        ? "Hi! I'd like to order " + qty + "x Tulsi (Holy Basil) - ₹" + (25 * qty) 
        : "Hi! I'd like to order Tulsi (Holy Basil) - ₹25";
      this.href = "https://wa.me/916393394554?text=" + encodeURIComponent(baseText);
    });
  }
})();
