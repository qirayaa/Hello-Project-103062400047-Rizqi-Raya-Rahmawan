// static/js/contact.js

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-message-form');
    const submissionMessage = document.getElementById('form-submission-message');
    const errorMessage = document.getElementById('form-error-message');

    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Mencegah pengiriman form default

            // Sembunyikan pesan sebelumnya
            submissionMessage.style.display = 'none';
            errorMessage.style.display = 'none';

            const formData = new FormData(contactForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            console.log("Mengirim data kontak:", data);

            try {
                // Mengirim data sebagai query parameters ke server Go
                // Catatan: Ini adalah contoh sederhana untuk demonstrasi.
                // Untuk data sensitif atau lebih banyak, gunakan POST dengan JSON.
                const queryParams = new URLSearchParams(data).toString();
                const response = await fetch(`/contact?${queryParams}`, {
                    method: 'GET', // Menggunakan GET untuk demonstrasi, POST lebih disarankan untuk formulir
                    // headers: {
                    //     'Content-Type': 'application/json' // Tidak diperlukan untuk GET dengan query params
                    // },
                    // body: JSON.stringify(data) // Tidak diperlukan untuk GET
                });

                if (response.ok) {
                    // Dalam kasus ini, respons OK berarti server menerima permintaan GET
                    // dan mencatatnya di konsol Go.
                    submissionMessage.textContent = 'Pesan Anda berhasil dikirim!';
                    submissionMessage.style.display = 'block';
                    contactForm.reset(); // Bersihkan formulir
                    console.log("Pesan berhasil dikirim (simulasi). Lihat konsol server Go.");
                } else {
                    // Jika ada masalah HTTP, misalnya 400 Bad Request atau 500 Internal Server Error
                    const errorText = await response.text();
                    errorMessage.textContent = `Terjadi kesalahan saat mengirim pesan: ${response.status} - ${errorText || response.statusText}`;
                    errorMessage.style.display = 'block';
                    console.error("Gagal mengirim pesan:", response.status, errorText);
                }
            } catch (error) {
                // Kesalahan jaringan
                errorMessage.textContent = 'Terjadi kesalahan jaringan. Periksa koneksi Anda dan coba lagi.';
                errorMessage.style.display = 'block';
                console.error('Kesalahan jaringan saat mengirim pesan:', error);
            }
        });
    } else {
        console.warn("Elemen formulir kontak (#contact-message-form) tidak ditemukan.");
    }
});