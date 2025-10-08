// static/js/menu.js

document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('.add-to-cart-button');

    addToCartButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const id = event.target.dataset.id;
            const name = event.target.dataset.name;
            const price = parseFloat(event.target.dataset.price); // Pastikan ini float

            try {
                const response = await fetch('/api/add-to-cart', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id, quantity: 1 }) // Selalu tambahkan 1 saat dari menu
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(`${name} telah ditambahkan ke keranjang!`);
                    // Anda bisa menambahkan visual feedback lain,
                    // seperti update ikon keranjang atau notifikasi Toast.
                    console.log('Cart updated:', result.cart);
                } else {
                    const errorData = await response.json();
                    alert(`Gagal menambahkan ${name} ke keranjang: ${errorData.error || response.statusText}`);
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Terjadi kesalahan jaringan saat menambahkan ke keranjang.');
            }
        });
    });
});
