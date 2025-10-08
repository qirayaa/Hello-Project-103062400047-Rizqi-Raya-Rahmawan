// static/js/receipt.js

document.addEventListener('DOMContentLoaded', () => {
    const receiptDetailsDiv = document.getElementById('receipt-details');
    const printReceiptButton = document.getElementById('print-receipt-button');
    const urlParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = urlParams.get('order_id'); // Ambil order_id dari URL

    // Mengambil checkoutDetails dari sessionStorage
    const checkoutDetailsString = sessionStorage.getItem('checkoutDetails');
    let checkoutDetails = null;

    if (checkoutDetailsString) {
        try {
            checkoutDetails = JSON.parse(checkoutDetailsString);
            // Perlu parsing OrderTime menjadi Date object lagi jika datang sebagai string
            if (checkoutDetails.order && typeof checkoutDetails.order.OrderTime === 'string') {
                checkoutDetails.order.OrderTime = new Date(checkoutDetails.order.OrderTime);
            }
        } catch (e) {
            console.error("Error parsing checkoutDetails from sessionStorage:", e);
            checkoutDetails = null;
        }
    }

    // Fungsi formatRupiah yang sama seperti di cart.js
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

    if (checkoutDetails && checkoutDetails.orderID === orderIdFromUrl && checkoutDetails.order) {
        // Tampilkan detail pesanan di halaman dari sessionStorage
        let itemsHtml = '';
        if (Array.isArray(checkoutDetails.order.Items) && checkoutDetails.order.Items.length > 0) {
            checkoutDetails.order.Items.forEach(item => {
                const itemName = item.Name || 'Nama Tidak Diketahui';
                const itemPrice = typeof item.Price === 'number' ? item.Price : 0;
                const itemQuantity = typeof item.Quantity === 'number' ? item.Quantity : 0;
                itemsHtml += `<p>${itemName} (${itemQuantity}x) - ${formatRupiah(itemPrice * itemQuantity)}</p>`;
            });
        } else {
            console.warn("WARNING: checkoutDetails.order.Items is empty or not an array:", checkoutDetails.order.Items);
            itemsHtml = '<p>Tidak ada item pesanan yang ditemukan.</p>';
        }

        // Mengonversi waktu pesanan ke zona waktu lokal Indonesia (WIB)
        const orderTime = checkoutDetails.order.OrderTime;
        const options = {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Jakarta'
        };
        const formattedOrderTime = orderTime.toLocaleString('id-ID', options);

        // Render tampilan struk ke dalam div receipt-details
        receiptDetailsDiv.innerHTML = `
            <div class="receipt-header">
                <h3>Kopi Asik</h3>
                <p>Jl. Halimun Raya No.2</p>
                <p>Jakarta Selatan, Indonesia</p>
                <p>Telp: +62 812-3456-7890</p>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-info">
                <p>ID Pesanan: <span>${checkoutDetails.order.OrderID}</span></p>
                <p>Waktu Pesanan: <span>${formattedOrderTime}</span></p>
                <p>Nama Pelanggan: <span>${checkoutDetails.order.CustomerName}</span></p>
                <p>Metode Pembayaran: <span>${checkoutDetails.order.PaymentMethod}</span></p>
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-items">
                <h4>Item Pesanan:</h4>
                ${itemsHtml}
            </div>
            <div class="receipt-divider"></div>
            <div class="receipt-total">
                <p><strong>Total Pembayaran: ${formatRupiah(checkoutDetails.order.TotalAmount)}</strong></p>
            </div>
            <div class="receipt-footer">
                <p>Pemesanan berhasil diproses! Keranjang Anda telah dikosongkan.</p>
                <p>Terima Kasih Atas Pesanan Anda!</p>
                <p>Datang Kembali!</p>
            </div>
        `;

        console.log("DEBUG: Checkout Details loaded from sessionStorage and rendered:", checkoutDetails);

        // Tambahkan event listener untuk tombol cetak
        if (printReceiptButton) {
            printReceiptButton.addEventListener('click', async () => {
                console.log("DEBUG: Cetak Struk button clicked. Sending order data to PDF endpoint.");

                try {
                    // Kirim objek order lengkap sebagai JSON ke backend
                    const response = await fetch('/print-receipt', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(checkoutDetails.order) // Kirim objek order dari checkoutDetails
                    });

                    console.log("DEBUG: Response from /print-receipt status:", response.status);

                    if (response.ok) {
                        const blob = await response.blob(); // Dapatkan respons sebagai Blob (binary data)
                        console.log("DEBUG: Blob received:", blob);
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `struk_pesanan_${checkoutDetails.order.OrderID}.pdf`; // Nama file download
                        document.body.appendChild(a);
                        a.click(); // Memicu unduhan
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        console.log("PDF downloaded successfully!");
                    } else {
                        const errorText = await response.text();
                        console.error("Failed to generate PDF:", response.status, errorText);
                        alert(`Gagal membuat PDF: ${errorText || response.statusText}. Cek konsol browser dan log server untuk detail.`);
                    }
                } catch (error) {
                    console.error("Error during PDF download fetch:", error);
                    alert("Terjadi kesalahan saat mengunduh PDF. Cek konsol browser.");
                }
            });
        } else {
            console.warn("WARNING: Print button not found on receipt page.");
        }
    } else {
        // Tampilkan pesan jika tidak ada detail pesanan atau orderId tidak cocok
        receiptDetailsDiv.innerHTML = `
            <p style="color: red; text-align: center;">Tidak ada detail pesanan yang ditemukan untuk ID: ${orderIdFromUrl || 'Tidak diketahui'}.</p>
            <p style="text-align: center;">Silakan kembali ke halaman <a href="/">Beranda</a> atau <a href="/menu">Menu</a> dan coba lagi.</p>
        `;
        if (printReceiptButton) printReceiptButton.style.display = 'none';
        console.warn("WARNING: No valid checkout details found in sessionStorage or orderId mismatch.");
    }
});
