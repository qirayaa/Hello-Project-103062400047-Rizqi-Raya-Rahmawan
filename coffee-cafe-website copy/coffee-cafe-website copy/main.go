package main

import (
	"fmt"
	"html/template"
	"log"
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Definisikan struktur untuk item menu
type MenuItem struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Image       string  `json:"image"`
	Category    string  `json:"category"`
	Rating      float64 `json:"rating"`
}

// Struct untuk item keranjang (data internal di server)
// MenuItem disematkan untuk mendapatkan detail item langsung
type CartItem struct {
	MenuItem // Embed MenuItem directly
	Quantity int    `json:"quantity"`
}

// Struct DTO untuk respons item keranjang ke frontend (struktur flat)
// Ini adalah representasi flat dari CartItem untuk kemudahan konsumsi di JS
type CartItemResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Image       string  `json:"image"`
	Category    string  `json:"category"`
	Rating      float64 `json:"rating"`
	Quantity    int     `json:"quantity"`
}

// Struct untuk Checkout Request dari frontend
type CheckoutRequest struct {
	CustomerName  string `json:"customerName"`
	PaymentMethod string `json:"paymentMethod"`
}

// Struct untuk data order yang akan disimpan dan dikirim ke frontend
type Order struct {
	OrderID       string     `json:"orderID"`
	CustomerName  string     `json:"customerName"`
	PaymentMethod string     `json:"paymentMethod"`
	Items         []CartItem `json:"items"` // Items adalah slice dari CartItem (yang sudah mengandung MenuItem)
	TotalAmount   float64    `json:"totalAmount"`
	OrderTime     string     `json:"orderTime"` // Format string untuk kemudahan serialisasi/deserialisasi
}

// Struct untuk pesan kontak
type ContactMessage struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

var (
	cart        = make(map[string]CartItem)
	cartMutex   sync.Mutex
	menu        = []MenuItem{} // Global variable to hold menu items
	orders      = make(map[string]Order)
	nextOrderID = 1
	orderMutex  sync.Mutex
)

// init() function to populate the menu items when the program starts
func init() {
	menu = []MenuItem{
		{ID: "coffee-espresso", Name: "Espresso", Description: "Kopi pekat yang intens", Price: 25000, Image: "/static/img/menu/espresso.jpg", Category: "Kopi", Rating: 4.5},
		{ID: "coffee-cappuccino", Name: "Cappuccino", Description: "Espresso dengan susu steamed dan foam", Price: 30000, Image: "/static/img/menu/cappuccino.jpg", Category: "Kopi", Rating: 4.8},
		{ID: "coffee-latte", Name: "Latte", Description: "Espresso dengan susu steamed dan sedikit foam", Price: 32000, Image: "/static/img/menu/latte.jpg", Category: "Kopi", Rating: 4.7},
		{ID: "coffee-americano", Name: "Americano", Description: "Espresso dengan air panas", Price: 28000, Image: "/static/img/menu/americano.jpg", Category: "Kopi", Rating: 4.2},
		{ID: "coffee-mocha", Name: "Mocha", Description: "Kopi cokelat yang manis dan creamy", Price: 35000, Image: "/static/img/menu/mocha.jpg", Category: "Kopi", Rating: 4.9},
		{ID: "coffee-macchiato", Name: "Macchiato", Description: "Espresso dengan sedikit sentuhan foam susu", Price: 30000, Image: "/static/img/menu/macchiato.jpg", Category: "Kopi", Rating: 4.3},
		{ID: "coffee-flatwhite", Name: "Flat White", Description: "Espresso dengan susu steamed lembut, kurang foam dari latte", Price: 34000, Image: "/static/img/menu/flat_white.jpg", Category: "Kopi", Rating: 4.6},
		{ID: "coffee-affogato", Name: "Affogato", Description: "Espresso panas yang dituangkan di atas es krim vanila", Price: 38000, Image: "/static/img/menu/affogato.jpg", Category: "Kopi", Rating: 4.7},

		{ID: "noncoffee-greentealatte", Name: "Green Tea Latte", Description: "Matcha terbaik dengan susu steamed", Price: 33000, Image: "/static/img/menu/greentea_latte.jpg", Category: "Non-Kopi", Rating: 4.5},
		{ID: "noncoffee-redvelvet", Name: "Red Velvet Latte", Description: "Minuman manis dengan rasa red velvet yang khas", Price: 35000, Image: "/static/img/menu/red_velvet_latte.jpg", Category: "Non-Kopi", Rating: 4.4},
		{ID: "noncoffee-chocolatefrappe", Name: "Chocolate Frappe", Description: "Minuman cokelat dingin yang diblender dengan es", Price: 40000, Image: "/static/img/menu/chocolate_frappe.jpg", Category: "Non-Kopi", Rating: 4.6},
		{ID: "noncoffee-lemontea", Name: "Lemon Tea", Description: "Teh segar dengan perasan lemon", Price: 25000, Image: "/static/img/menu/lemon_tea.jpg", Category: "Non-Kopi", Rating: 4.1},

		{ID: "food-croissant", Name: "Croissant", Description: "Pastry croissant Prancis", Price: 18000, Image: "/static/img/menu/croissant.jpg", Category: "Makanan & Snack", Rating: 4.3},
		{ID: "food-redvelvetcake", Name: "Red Velvet Cake", Description: "Kue beludru merah dengan cream cheese banding", Price: 33000, Image: "/static/img/menu/red_velvet_cake.jpg", Category: "Makanan & Snack", Rating: 4.8},
		{ID: "food-painauchocolat", Name: "Pain Au Chocolat", Description: "Pastry Prancis dengan isian cokelat", Price: 20000, Image: "/static/img/menu/pain_au_chocolat.jpg", Category: "Makanan & Snack", Rating: 4.2},
		{ID: "food-blueberrymuffin", Name: "Blueberry Muffin", Description: "Muffin lembut dengan blueberry asli", Price: 22000, Image: "/static/img/menu/blueberry_muffin.jpg", Category: "Makanan & Snack", Rating: 4.4},
		{ID: "food-chickensandwich", Name: "Chicken Sandwich", Description: "Roti panggang dengan isian ayam dan sayuran segar", Price: 45000, Image: "/static/img/menu/chicken_sandwich.jpg", Category: "Makanan & Snack", Rating: 4.6},
	}
}

// seq generates a sequence of integers from start to end (inclusive)
func seq(start, end int) []int {
	s := make([]int, end-start+1)
	for i := range s {
		s[i] = start + i
	}
	return s
}

// formatRupiahGo formats a float64 into a Rupiah string (e.g., "Rp 25000")
func formatRupiahGo(amount float64) string {
	return "Rp " + strconv.FormatFloat(amount, 'f', 0, 64)
}

func main() {
	router := gin.Default()

	// Set custom template functions
	router.SetFuncMap(template.FuncMap{
		"floor": func(f float64) int {
			return int(math.Floor(f))
		},
		"seq": seq,
		"add": func(a, b int) int {
			return a + b
		},
		"mod": func(f float64, m float64) float64 {
			if m == 0 {
				return f // Avoid division by zero
			}
			return math.Mod(f, m)
		},
		"formatRupiah": formatRupiahGo,
		"mul": func(a, b float64) float64 {
			return a * b
		},
	})

	// Load HTML templates from the "templates" directory
	router.LoadHTMLGlob("templates/*.html")
	// Serve static files from the "static" directory
	router.Static("/static", "./static")

	// --- Routes for HTML Pages ---
	router.GET("/", homeHandler)
	router.GET("/menu", menuHandler)
	router.GET("/about", aboutHandler)
	router.GET("/gallery", galleryHandler)
	router.GET("/contact", contactHandler)
	router.GET("/cart", cartPageHandler)
	router.GET("/receipt", receiptPageHandler) // Handles GET requests to /receipt

	// --- API Endpoints ---
	router.POST("/api/add-to-cart", addToCartHandler)
	router.POST("/api/update-cart", updateCartHandler)
	router.POST("/api/remove-cart", removeCartHandler)
	router.POST("/api/checkout", checkoutHandler) // Handles POST requests for checkout
	router.GET("/api/cart-items", getCartItemsHandler)
	router.POST("/api/contact", contactApiHandler) // Handles POST requests for contact form submission

	log.Println("Server starting on :8080")
	router.Run(":8080")
}

// --- Page Handlers ---

func homeHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "index.html", gin.H{
		"title": "Kopi Asik - Beranda",
	})
}

func menuHandler(c *gin.Context) {
	// Group menu items by category for easier rendering in the template
	menuByCategory := make(map[string][]MenuItem)
	for _, item := range menu {
		menuByCategory[item.Category] = append(menuByCategory[item.Category], item)
	}
	c.HTML(http.StatusOK, "menu.html", gin.H{
		"title":          "Kopi Asik - Menu",
		"menuByCategory": menuByCategory,
	})
}

func aboutHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "about.html", gin.H{
		"title": "Kopi Asik - Tentang Kami",
	})
}

func galleryHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "gallery.html", gin.H{
		"title": "Kopi Asik - Galeri",
	})
}

func contactHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "contact.html", gin.H{
		"title":   "Kopi Asik - Kontak Kami",
		"address": "Jl. Kopi Nikmat No. 123, Coffee Town",
		"phone":   "0812-3456-7890",
		"email":   "info@kopiasik.com",
		"hours":   "Setiap Hari: 08:00 - 22:00",
	})
}

func cartPageHandler(c *gin.Context) {
	c.HTML(http.StatusOK, "cart.html", gin.H{
		"title": "Kopi Asik - Keranjang",
	})
}

// receiptPageHandler now retrieves order details from the global 'orders' map
// using the order_id passed as a query parameter.
func receiptPageHandler(c *gin.Context) {
	orderID := c.Query("order_id")
	var orderData Order
	found := false

	orderMutex.Lock()
	if orderID != "" {
		orderData, found = orders[orderID]
	}
	orderMutex.Unlock()

	if !found {
		log.Printf("WARNING: receiptPageHandler - Order ID '%s' not found.", orderID)
		// Optionally, you might want to redirect to an error page or show a specific message
		c.HTML(http.StatusOK, "receipt.html", gin.H{
			"title":   "Kopi Asik - Struk Pembelian",
			"Message": "Detail pesanan tidak ditemukan. Mungkin sudah kadaluarsa atau ID tidak valid.",
			"Found":   false,
		})
		return
	}

	c.HTML(http.StatusOK, "receipt.html", gin.H{
		"title": "Kopi Asik - Struk Pembelian",
		"Order": orderData, // Pass the entire order object to the template
		"Found": true,      // Indicate that an order was found
	})
}

// --- API Handlers ---

// getCartItemsHandler sends a flattened list of cart items (CartItemResponse) to the frontend
func getCartItemsHandler(c *gin.Context) {
	cartMutex.Lock()
	defer cartMutex.Unlock()

	log.Printf("DEBUG: getCartItemsHandler - Isi `cart` map sebelum diproses: %+v", cart)

	if len(cart) == 0 {
		log.Println("DEBUG: getCartItemsHandler - Keranjang kosong, mengirim list DTO kosong.")
		c.JSON(http.StatusOK, gin.H{"items": []CartItemResponse{}})
		return
	}

	cartItemsResponseList := make([]CartItemResponse, 0, len(cart))
	for itemID, cartItemData := range cart {
		// cartItemData is a CartItem, which has MenuItem embedded
		log.Printf("DEBUG: getCartItemsHandler - Memproses item ID: %s, Data Internal CartItem: %+v, Nama dari MenuItem: %s, Harga dari MenuItem: %.2f, Kuantitas: %d",
			itemID, cartItemData, cartItemData.MenuItem.Name, cartItemData.MenuItem.Price, cartItemData.Quantity)

		respItem := CartItemResponse{
			ID:          cartItemData.MenuItem.ID,
			Name:        cartItemData.MenuItem.Name,
			Description: cartItemData.MenuItem.Description,
			Price:       cartItemData.MenuItem.Price,
			Image:       cartItemData.MenuItem.Image,
			Category:    cartItemData.MenuItem.Category,
			Rating:      cartItemData.MenuItem.Rating,
			Quantity:    cartItemData.Quantity, // Quantity directly from CartItem
		}
		cartItemsResponseList = append(cartItemsResponseList, respItem)
	}

	log.Printf("DEBUG: getCartItemsHandler - Mengirim %d item keranjang. Data List DTO untuk JSON: %+v", len(cartItemsResponseList), cartItemsResponseList)
	c.JSON(http.StatusOK, gin.H{"items": cartItemsResponseList})
}

// addToCartHandler adds a menu item to the cart or increments its quantity
func addToCartHandler(c *gin.Context) {
	var request struct {
		ID string `json:"id"`
	}
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid"})
		log.Printf("ERROR: addToCartHandler - BindJSON: %v", err)
		return
	}

	cartMutex.Lock()
	defer cartMutex.Unlock()

	var foundMenuItem *MenuItem // Use pointer to check if item was found
	for i := range menu {       // Iterate using index to get address
		if menu[i].ID == request.ID {
			foundMenuItem = &menu[i]
			break
		}
	}

	if foundMenuItem == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item menu tidak ditemukan"})
		log.Printf("ERROR: addToCartHandler - Item menu tidak ditemukan ID: %s", request.ID)
		return
	}

	if cartItem, exists := cart[request.ID]; exists {
		cartItem.Quantity++
		cart[request.ID] = cartItem
		log.Printf("DEBUG: addToCartHandler - Kuantitas item '%s' (ID: %s) diperbarui menjadi %d", cartItem.MenuItem.Name, request.ID, cartItem.Quantity)
	} else {
		// Create a new CartItem by copying the found MenuItem
		newCartItem := CartItem{
			MenuItem: *foundMenuItem, // Dereference pointer to copy MenuItem value
			Quantity: 1,
		}
		cart[request.ID] = newCartItem
		log.Printf("DEBUG: addToCartHandler - Item '%s' (ID: %s) ditambahkan ke keranjang. Kuantitas: 1. Detail CartItem: %+v", foundMenuItem.Name, request.ID, newCartItem)
	}
	log.Printf("DEBUG: addToCartHandler - Isi keranjang saat ini (total %d item): %+v", len(cart), cart)
	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("'%s' berhasil ditambahkan ke keranjang!", foundMenuItem.Name)})
}

// updateCartHandler updates the quantity of an item in the cart
func updateCartHandler(c *gin.Context) {
	var request struct {
		ID       string `json:"id"`
		Quantity int    `json:"quantity"`
	}
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid"})
		log.Printf("ERROR: updateCartHandler - BindJSON: %v", err)
		return
	}

	cartMutex.Lock()
	defer cartMutex.Unlock()

	if item, exists := cart[request.ID]; exists {
		if request.Quantity <= 0 {
			itemName := item.MenuItem.Name // Save name for log before deletion
			delete(cart, request.ID)
			log.Printf("DEBUG: updateCartHandler - Item '%s' (ID: %s) dihapus dari keranjang (kuantitas <= 0).", itemName, request.ID)
		} else {
			item.Quantity = request.Quantity
			cart[request.ID] = item
			log.Printf("DEBUG: updateCartHandler - Kuantitas item '%s' (ID: %s) diperbarui menjadi %d.", item.MenuItem.Name, request.ID, item.Quantity)
		}
		c.JSON(http.StatusOK, gin.H{"message": "Keranjang berhasil diperbarui"})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Item tidak ditemukan di keranjang"})
	log.Printf("ERROR: updateCartHandler - Item ID '%s' tidak ditemukan di keranjang.", request.ID)
}

// removeCartHandler removes an item from the cart
func removeCartHandler(c *gin.Context) {
	var request struct {
		ID string `json:"id"`
	}
	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid"})
		log.Printf("ERROR: removeCartHandler - BindJSON: %v", err)
		return
	}

	cartMutex.Lock()
	defer cartMutex.Unlock()

	if item, exists := cart[request.ID]; exists {
		itemName := item.MenuItem.Name
		delete(cart, request.ID)
		log.Printf("DEBUG: removeCartHandler - Item '%s' (ID: %s) berhasil dihapus dari keranjang.", itemName, request.ID)
		c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Item '%s' berhasil dihapus dari keranjang", itemName)})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Item tidak ditemukan di keranjang"})
	log.Printf("ERROR: removeCartHandler - Item ID '%s' tidak ditemukan di keranjang untuk dihapus.", request.ID)
}

// checkoutHandler processes the order and stores it, then clears the cart
func checkoutHandler(c *gin.Context) {
	var req CheckoutRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Permintaan tidak valid"})
		log.Printf("ERROR: checkoutHandler - BindJSON: %v", err)
		return
	}

	if req.CustomerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nama Pelanggan tidak boleh kosong."})
		return
	}
	if req.PaymentMethod == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Metode pembayaran tidak boleh kosong."})
		return
	}

	cartMutex.Lock()
	if len(cart) == 0 {
		cartMutex.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Keranjang belanja kosong."})
		log.Println("INFO: checkoutHandler - Percobaan checkout dengan keranjang kosong.")
		return
	}

	checkoutCartItems := make([]CartItem, 0, len(cart))
	var total float64
	for _, item := range cart {
		checkoutCartItems = append(checkoutCartItems, item)
		total += item.MenuItem.Price * float64(item.Quantity) // Access Price from MenuItem
	}

	// Clear the global cart map after collecting items for the order
	cart = make(map[string]CartItem)
	cartMutex.Unlock() // Unlock cartMutex as cart has been processed

	orderMutex.Lock()
	orderID := "ORD-" + strconv.Itoa(nextOrderID)
	nextOrderID++
	orderMutex.Unlock()

	newOrder := Order{
		OrderID:       orderID,
		CustomerName:  req.CustomerName,
		PaymentMethod: req.PaymentMethod,
		Items:         checkoutCartItems, // This slice now contains the items for this specific order
		TotalAmount:   total,
		OrderTime:     time.Now().Format("02 January 2006, 15:04:05"), // Formatted time string
	}

	orderMutex.Lock()
	orders[orderID] = newOrder // Store the new order in the global orders map
	orderMutex.Unlock()

	log.Printf("INFO: Order %s berhasil diproses untuk %s. Total: %.2f. Metode: %s. Item: %d",
		orderID, req.CustomerName, total, req.PaymentMethod, len(checkoutCartItems))

	// Respond with the full order details for the frontend to store in sessionStorage
	c.JSON(http.StatusOK, gin.H{
		"message":       "Pemesanan berhasil diproses! Keranjang Anda telah dikosongkan.",
		"orderID":       orderID,
		"customerName":  req.CustomerName,  // Redundant but harmless, can be removed if `order` is complete
		"paymentMethod": req.PaymentMethod, // Redundant but harmless
		"order":         newOrder,          // Crucial: send the complete newOrder object
	})
}

// contactApiHandler processes contact form submissions via API
func contactApiHandler(c *gin.Context) {
	var msg ContactMessage
	if err := c.BindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data permintaan tidak valid."})
		log.Printf("ERROR: contactApiHandler - BindJSON: %v", err)
		return
	}
	log.Printf("KONTAK DITERIMA: Nama: %s, Email: %s, Subjek: %s, Pesan: %s",
		msg.Name, msg.Email, msg.Subject, msg.Message)
	// In a real application, you would save this message to a database or send an email.
	// For this example, we just log it.
	c.JSON(http.StatusOK, gin.H{"message": "Pesan Anda telah berhasil dikirim! Kami akan segera merespons."})
}