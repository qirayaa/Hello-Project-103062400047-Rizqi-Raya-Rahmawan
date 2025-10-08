// static/js/cart.js

document.addEventListener('DOMContentLoaded', () => {
    // Selected DOM elements
    const addToCartButtons = document.querySelectorAll('.add-to-cart-button');
    const cartItemsDiv = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const checkoutButton = document.getElementById('checkout-button');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartContentWrapper = document.getElementById('cart-content-wrapper');
    const customerNameInput = document.getElementById('customer-name');
    const paymentMethodSelect = document.getElementById('payment-method');
    const cartCountElement = document.getElementById('cart-item-count'); // Get this once
    const isCartPage = window.location.pathname === '/cart';

    console.log("DEBUG: cart.js loaded. Is this cart page?", isCartPage);

    /**
     * Formats a number into Indonesian Rupiah currency.
     * @param {number} number - The number to format.
     * @returns {string} The formatted Rupiah string.
     */
    function formatRupiah(number) {
        if (typeof number !== 'number' || isNaN(number)) {
            console.warn("DEBUG: formatRupiah received invalid number:", number);
            return 'Rp 0';
        }
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    /**
     * Updates the displayed item count in the cart icon/badge.
     */
    async function updateCartItemCountDisplay() {
        console.log("DEBUG: Calling updateCartItemCountDisplay...");
        if (!cartCountElement) {
            console.warn("WARNING: Cart count element not found. Skipping count display update.");
            return;
        }
        try {
            const response = await fetch('/api/cart-items');
            if (response.ok) {
                const data = await response.json();
                console.log("DEBUG: /api/cart-items response for count:", data);
                // Assume backend sends 'items' as an array of CartItem objects,
                // and each CartItem has a 'quantity' property (lowercase due to JSON tag).
                const itemCount = data.items ? data.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
                
                cartCountElement.textContent = itemCount;
                console.log("DEBUG: Cart item count updated to:", itemCount);
            } else {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                console.error('ERROR: Failed to fetch cart item count, HTTP status:', response.status, 'Message:', errorData.error);
                cartCountElement.textContent = '0'; // Set to 0 on error
            }
        } catch (error) {
            console.error('ERROR: Network error fetching cart item count:', error);
            cartCountElement.textContent = '0'; // Set to 0 on network error
        }
    }

    /**
     * Loads cart items from the API and renders them.
     */
    async function loadCartItems() {
        console.log("DEBUG: Calling loadCartItems...");
        const requiredCartElements = [
            cartItemsDiv, cartTotalSpan, checkoutButton, emptyCartMessage,
            cartContentWrapper, customerNameInput, paymentMethodSelect
        ];
        const allElementsFound = requiredCartElements.every(el => el !== null);

        // Only proceed if on cart page and all required elements are present
        if (!isCartPage || !allElementsFound) {
            console.warn('WARNING: Not on cart page or essential cart elements not found. Aborting loadCartItems.');
            updateCartItemCountDisplay(); // Still update count even if not on cart page
            // If on cart page but elements are missing, display an error message and disable checkout
            if (isCartPage && cartItemsDiv) {
                cartItemsDiv.innerHTML = '<p style="color: red;">Kesalahan inisialisasi keranjang. Beberapa elemen penting tidak ditemukan.</p>';
            }
            if (emptyCartMessage) emptyCartMessage.style.display = 'none';
            if (cartContentWrapper) cartContentWrapper.style.display = 'block';
            if (checkoutButton) checkoutButton.disabled = true;
            if (customerNameInput) customerNameInput.required = false;
            if (paymentMethodSelect) paymentMethodSelect.required = false;
            return;
        }

        try {
            const response = await fetch('/api/cart-items');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
                console.error('ERROR: /api/cart-items HTTP error! Status:', response.status, 'Message:', errorData.error || response.statusText);
                throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            console.log("DEBUG: loadCartItems - Raw data received from /api/cart-items:", JSON.stringify(data, null, 2));

            // Ensure data.items is an array, as expected from Go backend's JSON response
            const items = Array.isArray(data.items) ? data.items : [];
            console.log("DEBUG: loadCartItems - Items to be rendered:", items);
            renderCart(items);
        } catch (error) {
            console.error('ERROR: Error loading cart items:', error);
            if (cartItemsDiv) cartItemsDiv.innerHTML = '<p style="color: red;">Gagal memuat keranjang. Pastikan server berjalan dan coba lagi.</p>';
            if (emptyCartMessage) emptyCartMessage.style.display = 'block';
            if (cartContentWrapper) cartContentWrapper.style.display = 'none';
            if (checkoutButton) checkoutButton.disabled = true;
            if (customerNameInput) customerNameInput.required = false;
            if (paymentMethodSelect) paymentMethodSelect.required = false;
        } finally {
            updateCartItemCountDisplay(); // Always update count regardless of loadCartItems success
        }
    }

    /**
     * Renders the cart items on the page.
     * @param {Array<Object>} items - An array of cart item objects.
     */
    function renderCart(items) {
        console.log("DEBUG: Rendering cart with items:", items);
        // Re-check for essential elements, important if loadCartItems was skipped due to missing elements
        const requiredForRender = [cartItemsDiv, cartTotalSpan, emptyCartMessage, cartContentWrapper, checkoutButton, customerNameInput, paymentMethodSelect];
        if (!isCartPage || !requiredForRender.every(el => el !== null)) {
            console.warn('WARNING: Essential cart elements missing for rendering on cart page. Aborting render.');
            return;
        }

        cartItemsDiv.innerHTML = ''; // Clear previous content
        let total = 0;

        if (items && items.length > 0) {
            emptyCartMessage.style.display = 'none';
            cartContentWrapper.style.display = 'block';
            checkoutButton.disabled = false;
            customerNameInput.required = true;
            paymentMethodSelect.required = true;

            items.forEach(item => {
                console.log("DEBUG: renderCart - Rendering item:", JSON.stringify(item, null, 2));

                // Access properties using camelCase, as defined by JSON tags in Go structs
                const itemName = item.name || 'Nama Tidak Diketahui';
                const itemPrice = typeof item.price === 'number' ? item.price : 0;
                const itemID = item.id || `unknown-item-${Math.random().toString(36).substr(2, 9)}`;
                const itemQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
                const itemImage = item.image || '/static/img/default.jpg'; // Provide a default image if none

                console.log(`DEBUG: renderCart - Parsed values: ID=${itemID}, Name=${itemName}, Price=${itemPrice}, Qty=${itemQuantity}, Image=${itemImage}`);

                const itemTotal = itemPrice * itemQuantity;
                total += itemTotal;

                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                cartItemDiv.setAttribute('data-id', itemID);
                cartItemDiv.innerHTML = `
                    <img src="${itemImage}" alt="${itemName}" class="cart-item-image" style="width: 80px; height: 80px; object-fit: cover; margin-right: 15px;">
                    <div>
                        <h3>${itemName}</h3>
                        <p>Harga Satuan: ${formatRupiah(itemPrice)}</p>
                        <div class="cart-item-controls">
                            <label for="quantity-${itemID}">Jumlah:</label>
                            <input type="number" id="quantity-${itemID}" class="item-quantity-input" value="${itemQuantity}" min="0" data-id="${itemID}" data-old-value="${itemQuantity}">
                            <span class="item-subtotal">Subtotal: ${formatRupiah(itemTotal)}</span>
                            <button class="button button-danger button-small remove-item-button" data-id="${itemID}">Hapus</button>
                        </div>
                    </div>
                `;
                cartItemsDiv.appendChild(cartItemDiv);
            });
        } else {
            emptyCartMessage.style.display = 'block';
            cartContentWrapper.style.display = 'none';
            checkoutButton.disabled = true;
            customerNameInput.required = false;
            paymentMethodSelect.required = false;
            console.log("DEBUG: Cart is empty, displaying empty cart message.");
        }

        cartTotalSpan.textContent = `Total: ${formatRupiah(total)}`;

        // Re-attach event listeners after re-rendering the cartItemsDiv content
        // Remove previous listeners to prevent multiple bindings if elements are recreated
        cartItemsDiv.removeEventListener('change', handleCartItemChange);
        cartItemsDiv.addEventListener('change', handleCartItemChange);
        cartItemsDiv.removeEventListener('click', handleCartItemClick);
        cartItemsDiv.addEventListener('click', handleCartItemClick);
    }

    /**
     * Handles change events for cart items (e.g., quantity input).
     * @param {Event} event - The DOM event.
     */
    function handleCartItemChange(event) {
        if (event.target.classList.contains('item-quantity-input')) {
            updateCartItemQuantity(event);
        }
    }

    /**
     * Handles click events for cart items (e.g., remove button).
     * @param {Event} event - The DOM event.
     */
    function handleCartItemClick(event) {
        if (event.target.classList.contains('remove-item-button')) {
            removeCartItem(event);
        }
    }

    /**
     * Adds an item to the cart via API.
     * @param {Event} event - The DOM event from the add-to-cart button.
     */
    async function addToCart(event) {
        const itemId = event.target.dataset.id;
        console.log("DEBUG: Attempting to add item with ID:", itemId);
        if (!itemId) {
            alert("Terjadi kesalahan: ID produk tidak valid. Silakan coba lagi.");
            console.error("ERROR: Invalid product ID for add to cart:", event.target.dataset.id);
            return;
        }
        try {
            const response = await fetch('/api/add-to-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId }),
            });
            const data = await response.json();
            console.log("DEBUG: Response from /api/add-to-cart:", data);
            if (!response.ok) {
                alert(`Gagal menambahkan item ke keranjang: ${data.error || 'Terjadi kesalahan tidak diketahui.'}`);
                console.error('ERROR: Adding to cart failed:', data.error);
            } else {
                alert(data.message || 'Item berhasil ditambahkan ke keranjang!');
                if (isCartPage) {
                    loadCartItems(); // Reload all items on cart page
                } else {
                    updateCartItemCountDisplay(); // Just update the count on other pages
                }
            }
        } catch (error) {
            console.error('ERROR: Network error adding to cart:', error);
            alert('Terjadi kesalahan jaringan saat menambahkan item. Silakan coba lagi.');
        }
    }

    /**
     * Updates the quantity of a cart item via API.
     * @param {Event} event - The DOM event from the quantity input.
     */
    async function updateCartItemQuantity(event) {
        const itemId = event.target.dataset.id;
        const newQuantity = parseInt(event.target.value, 10);
        const oldQuantity = parseInt(event.target.dataset.oldValue, 10); // Store original value to revert if needed
        console.log(`DEBUG: Attempting to update item ${itemId} to quantity ${newQuantity}`);

        if (isNaN(newQuantity) || newQuantity < 0) {
            alert('Jumlah tidak valid. Harap masukkan angka positif.');
            event.target.value = oldQuantity; // Revert to old value
            return;
        }
        if (newQuantity === 0) {
            console.log(`DEBUG: Quantity for item ${itemId} is 0, attempting to remove.`);
            // Simulate remove button click to trigger removal logic
            removeCartItem({ target: { dataset: { id: itemId } } });
            return;
        }
        
        // Prevent unnecessary API calls if quantity hasn't changed
        if (newQuantity === oldQuantity) {
            console.log(`DEBUG: Quantity for item ${itemId} is unchanged (${newQuantity}), skipping API call.`);
            return;
        }

        try {
            const response = await fetch('/api/update-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId, quantity: newQuantity }),
            });
            const data = await response.json();
            console.log("DEBUG: Response from /api/update-cart:", data);
            if (!response.ok) {
                alert(`Gagal memperbarui jumlah item: ${data.error || 'Terjadi kesalahan tidak diketahui.'}`);
                console.error('ERROR: Updating cart quantity failed:', data.error);
                event.target.value = oldQuantity; // Revert on failure
            }
            // Always reload cart items to ensure UI is consistent with backend state
            loadCartItems();
        } catch (error) {
            console.error('ERROR: Network error updating cart quantity:', error);
            alert('Terjadi kesalahan jaringan saat memperbarui jumlah. Silakan coba lagi.');
            event.target.value = oldQuantity; // Revert on network error
            loadCartItems(); // Attempt to reload anyway to show current state if possible
        }
    }

    /**
     * Removes a cart item via API.
     * @param {Event} event - The DOM event from the remove button.
     */
    async function removeCartItem(event) {
        const itemId = event.target.dataset.id;
        console.log("DEBUG: Attempting to remove item with ID:", itemId);
        if (!itemId) {
            console.error("ERROR: Invalid product ID for remove from cart:", event.target.dataset.id);
            alert("Terjadi kesalahan: ID produk tidak valid. Silakan coba lagi.");
            return;
        }
        if (!confirm('Anda yakin ingin menghapus item ini dari keranjang?')) {
            // If user cancels, ensure the cart state is reloaded in case quantity input triggered it
            loadCartItems(); 
            return;
        }
        try {
            const response = await fetch('/api/remove-cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId }),
            });
            const data = await response.json();
            console.log("DEBUG: Response from /api/remove-cart:", data);
            if (!response.ok) {
                alert(`Gagal menghapus item dari keranjang: ${data.error || 'Terjadi kesalahan tidak diketahui.'}`);
                console.error('ERROR: Removing cart item failed:', data.error);
            } else {
                alert(data.message || 'Item berhasil dihapus.');
            }
            loadCartItems(); // Always reload cart items to reflect removal
        } catch (error) {
            console.error('ERROR: Network error removing cart item:', error);
            alert('Terjadi kesalahan jaringan saat menghapus item. Silakan coba lagi.');
            loadCartItems(); // Attempt to reload anyway
        }
    }

    /**
     * Initiates the checkout process via API.
     */
    async function checkout() {
        const customerName = customerNameInput.value.trim();
        const paymentMethod = paymentMethodSelect.value;
        console.log(`DEBUG: Initiating checkout for customer: ${customerName}, method: ${paymentMethod}`);

        if (!customerName) {
            alert('Nama Pelanggan tidak boleh kosong.');
            customerNameInput.focus();
            return;
        }
        if (!paymentMethod) {
            alert('Metode pembayaran tidak boleh kosong.');
            paymentMethodSelect.focus();
            return;
        }

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: customerName,
                    paymentMethod: paymentMethod,
                }),
            });
            const data = await response.json();
            console.log("DEBUG: Response from /api/checkout:", data);

            if (!response.ok) {
                alert(`Gagal memproses pembayaran: ${data.error || 'Terjadi kesalahan tidak diketahui.'}`);
                console.error('ERROR: Checkout failed:', data.error);
            } else {
                alert(data.message || 'Pemesanan berhasil!');
                // Ensure data.order and data.order.items exist and are correctly formatted
                // Access properties using camelCase from Go backend's JSON tags
                if (data.orderID && data.order && Array.isArray(data.order.items)) {
                    console.log("DEBUG: Checkout successful. Storing details to sessionStorage and redirecting to receipt with order ID:", data.orderID);
                    const checkoutDetails = {
                        message: data.message,
                        customerName: data.order.customerName,
                        paymentMethod: data.order.paymentMethod,
                        cart: data.order.items, // This is crucial for the receipt page
                        total: data.order.totalAmount,
                        orderID: data.orderID,
                        orderTime: data.order.orderTime
                    };
                    sessionStorage.setItem('checkoutDetails', JSON.stringify(checkoutDetails));
                    window.location.href = `/receipt?order_id=${data.orderID}`;
                } else {
                    alert("Pemesanan berhasil, tetapi ID pesanan atau detail order (termasuk item) tidak ditemukan dalam respons. Silakan periksa log server.");
                    console.warn("WARNING: Checkout successful but no orderID or order details in response. Cart will be reloaded.", data);
                    loadCartItems(); // Reload cart in case of incomplete response
                }
            }
        } catch (error) {
            console.error('ERROR: Network error during checkout:', error);
            alert('Terjadi kesalahan jaringan saat checkout. Silakan coba lagi.');
        }
    }

    // --- Initialization Logic ---

    // Attach event listeners for "Add to Cart" buttons
    if (addToCartButtons.length > 0) {
        console.log("DEBUG: Attaching Add to Cart listeners to", addToCartButtons.length, "buttons.");
        addToCartButtons.forEach(button => {
            button.addEventListener('click', addToCart);
        });
    }

    // Initialize cart page specific functionality
    if (isCartPage) {
        console.log("DEBUG: Initializing cart page specific functionality.");
        // Ensure all required elements are present for cart page functionality
        const requiredCartElements = [
            cartItemsDiv, cartTotalSpan, checkoutButton, emptyCartMessage,
            cartContentWrapper, customerNameInput, paymentMethodSelect
        ];
        const allElementsFound = requiredCartElements.every(el => el !== null);

        if (allElementsFound) {
            if (checkoutButton) { // Ensure checkout button exists before adding listener
                checkoutButton.addEventListener('click', checkout);
            }
            loadCartItems(); // Load cart items only when on cart page
        } else {
            console.error("ERROR: Some essential cart elements are missing on the cart page. Cart functionality will be limited or broken.");
            if (cartItemsDiv) cartItemsDiv.innerHTML = '<p style="color: red;">Kesalahan inisialisasi keranjang. Beberapa elemen penting tidak ditemukan. Pastikan elemen HTML yang diperlukan ada di halaman.</p>';
            if (emptyCartMessage) emptyCartMessage.style.display = 'none';
            if (cartContentWrapper) cartContentWrapper.style.display = 'block';
            if (checkoutButton) checkoutButton.disabled = true;
            if (customerNameInput) customerNameInput.required = false;
            if (paymentMethodSelect) paymentMethodSelect.required = false;
            updateCartItemCountDisplay(); // Still update count even if cart page is broken
        }
    } else {
        // If not on the cart page, just update the cart item count display
        updateCartItemCountDisplay();
    }
});