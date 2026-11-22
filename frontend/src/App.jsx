import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8080/api/items";
const USER_API_URL = "http://localhost:8080/api/users";
const REQUEST_API_URL = "http://localhost:8080/api/requests";

const categories = ["All", "Furniture", "Books", "Electronics", "Accessories"];
const defaultImage =
  "https://images.unsplash.com/photo-1499933374294-4584851497cc?w=900&auto=format&fit=crop&q=85";

const initialForm = {
  name: "",
  description: "",
  category: "Books",
  itemCondition: "Good",
  type: "DONATE",
  location: ""
};

const labelStyle = {
  display: "block",
  marginTop: "12px",
  marginBottom: "6px",
  fontWeight: "600"
};

const formInputStyle = {
  width: "100%",
  padding: "11px",
  marginBottom: "8px",
  border: "1px solid #ddd",
  borderRadius: "6px",
  boxSizing: "border-box",
  fontSize: "14px"
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authData, setAuthData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    location: ""
  });
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // My Listings includes both AVAILABLE and UNAVAILABLE items.
  const [myListings, setMyListings] = useState([]);
  const [myListingsLoading, setMyListingsLoading] = useState(false);
  const [myListingsError, setMyListingsError] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [condition, setCondition] = useState("All");
  const [favorites, setFavorites] = useState(() => {
    try {
      const savedFavorites = localStorage.getItem("reusehub-favorites");
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch {
      return [];
    }
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showSellForm, setShowSellForm] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [sellerRequestLoading, setSellerRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [sellerRequestError, setSellerRequestError] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState(null);

  // FETCH AVAILABLE PRODUCTS FOR THE MARKETPLACE
  async function loadProducts() {
    try {
      setError("");
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Unable to fetch products");

      const data = await response.json();
      const availableItems = data
        .filter(
          (item) => item.status && item.status.toUpperCase() === "AVAILABLE"
        )
        .map((item) => ({
          ...item,
          condition: item.itemCondition || "Not specified",
          seller: item.user?.name || "Unknown Seller",
          image: defaultImage
        }));

      setProducts(availableItems);
    } catch (err) {
      console.error("Backend error:", err);
      setError(
        "Could not connect to the backend. Check whether Spring Boot is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // FETCH ALL LISTINGS OWNED BY THE LOGGED-IN USER
  async function loadMyListings() {
    if (!currentUser) return;

    try {
      setMyListingsLoading(true);
      setMyListingsError("");
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Unable to load your listings");

      const data = await response.json();
      const ownItems = data
        .filter(
          (item) => Number(item.user?.id) === Number(currentUser.userId)
        )
        .map((item) => ({
          ...item,
          condition: item.itemCondition || "Not specified",
          seller: item.user?.name || currentUser.name || "You",
          image: defaultImage
        }));

      setMyListings(ownItems);
    } catch (err) {
      console.error("My listings loading error:", err);
      setMyListingsError("Could not load your listings. Please try again.");
    } finally {
      setMyListingsLoading(false);
    }
  }

  // FETCH REQUESTS MADE BY THE LOGGED-IN USER
  async function loadMyRequests() {
    if (!currentUser) return;
    try {
      setRequestLoading(true);
      setRequestError("");
      const response = await fetch(REQUEST_API_URL);
      if (!response.ok) throw new Error("Unable to load requests");
      const data = await response.json();
      setMyRequests(
        data.filter(
          (request) =>
            Number(request.requester?.id) === Number(currentUser.userId)
        )
      );
    } catch (err) {
      console.error("Request loading error:", err);
      setRequestError("Could not load your requests.");
    } finally {
      setRequestLoading(false);
    }
  }

  // FETCH REQUESTS FOR ITEMS OWNED BY THE LOGGED-IN USER
  async function loadSellerRequests() {
    if (!currentUser) return;
    try {
      setSellerRequestLoading(true);
      setSellerRequestError("");
      const response = await fetch(REQUEST_API_URL);
      if (!response.ok) throw new Error("Unable to load seller requests");
      const data = await response.json();
      setSellerRequests(
        data.filter(
          (request) =>
            Number(request.item?.user?.id) === Number(currentUser.userId)
        )
      );
    } catch (err) {
      console.error("Seller request loading error:", err);
      setSellerRequestError("Could not load requests for your listings.");
    } finally {
      setSellerRequestLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // SAVE FAVORITES SO THEY REMAIN AFTER A PAGE REFRESH
  useEffect(() => {
    localStorage.setItem("reusehub-favorites", JSON.stringify(favorites));
  }, [favorites]);

  const favoriteProducts = products.filter((product) =>
    favorites.includes(product.id)
  );

  useEffect(() => {
    if (currentUser) {
      loadMyListings();
      loadMyRequests();
      loadSellerRequests();
    } else {
      setMyListings([]);
      setMyRequests([]);
      setSellerRequests([]);
    }
  }, [currentUser]);

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const endpoint = authMode === "register" ? "/register" : "/login";
      const payload =
        authMode === "register"
          ? authData
          : { email: authData.email, password: authData.password };

      const response = await fetch(`${USER_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      setCurrentUser({
        userId: data.userId,
        name: data.name,
        email: data.email
      });
      setAuthMessage(data.message || "Success!");
      setAuthData({
        name: "",
        email: "",
        password: "",
        college: "",
        location: ""
      });
    } catch (err) {
      setAuthError(err.message || "Unable to connect to the server.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setAuthMode("login");
    setAuthError("");
    setAuthMessage("");
    setSelectedProduct(null);
    setShowSellForm(false);
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.category?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "All" || product.category === category;
      const matchesCondition =
        condition === "All" || product.condition === condition;
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [products, search, category, condition]);

  function toggleFavorite(id) {
    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  }

  function getListingLabel(type) {
    if (type?.toUpperCase() === "DONATE") return "Free";
    if (type?.toUpperCase() === "EXCHANGE") return "Exchange";
    return "Contact Seller";
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleAddItem(event) {
    event.preventDefault();
    setFormMessage("");
    setFormError("");

    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.location.trim()
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }
    if (!currentUser) {
      setFormError("Please log in first.");
      return;
    }

    const newItem = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category,
      itemCondition: formData.itemCondition,
      type: formData.type,
      status: "AVAILABLE",
      location: formData.location.trim(),
      user: { id: currentUser.userId }
    };

    try {
      setSubmitting(true);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to add item.");
      }

      setFormMessage("Your item has been listed successfully!");
      await Promise.all([loadProducts(), loadMyListings()]);
      setFormData(initialForm);
      setTimeout(() => {
        setShowSellForm(false);
        setFormMessage("");
      }, 1500);
    } catch (err) {
      console.error("Add item error:", err);
      setFormError(err.message || "Unable to add item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteItem(itemId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${itemId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to delete item.");
      }
      alert("Item deleted successfully!");
      setSelectedProduct(null);
      await Promise.all([loadProducts(), loadMyListings()]);
    } catch (err) {
      alert(err.message || "Could not delete item.");
    }
  }

  // UPDATE LISTING STATUS FROM MY LISTINGS
  async function handleUpdateItemStatus(itemId, status) {
    const action =
      status === "UNAVAILABLE"
        ? "mark this item as unavailable"
        : "make this item available again";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    try {
      setUpdatingItemId(itemId);
      const response = await fetch(`${API_URL}/${itemId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to update item status.");
      }
      await Promise.all([loadProducts(), loadMyListings()]);
      alert(
        status === "UNAVAILABLE"
          ? "Item marked as unavailable."
          : "Item is available in the marketplace again."
      );
    } catch (err) {
      console.error("Item status update error:", err);
      alert(err.message || "Could not update item status.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleContactSeller() {
    if (!selectedProduct || !currentUser) return;
    if (
      Number(selectedProduct.user?.id) === Number(currentUser.userId)
    ) {
      alert("You cannot request your own item.");
      return;
    }

    try {
      const response = await fetch(REQUEST_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedProduct.id,
          requesterId: currentUser.userId
        })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Request failed.");
      }
      alert("Request sent successfully!");
      setSelectedProduct(null);
      await loadMyRequests();
    } catch (err) {
      console.error("Request error:", err);
      alert(err.message || "Could not connect to the server.");
    }
  }

  async function handleUpdateRequestStatus(requestId, status) {
    const action = status === "ACCEPTED" ? "accept" : "reject";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this request?`
    );
    if (!confirmed) return;

    try {
      setUpdatingRequestId(requestId);
      const response = await fetch(
        `${REQUEST_API_URL}/${requestId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        }
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Unable to ${action} request.`);
      }
      await Promise.all([loadSellerRequests(), loadMyRequests()]);
      alert(`Request ${action}ed successfully.`);
    } catch (err) {
      console.error("Update request error:", err);
      alert(err.message || "Could not update the request.");
    } finally {
      setUpdatingRequestId(null);
    }
  }

  // LOGIN / REGISTRATION SCREEN
  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          background: "#f1f5f1"
        }}
      >
        <div
          style={{
            background: "white",
            padding: "35px",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "430px",
            boxShadow: "0 5px 25px rgba(0,0,0,0.08)"
          }}
        >
          <h1
            style={{
              textAlign: "center",
              color: "#245c42",
              marginBottom: "5px"
            }}
          >
            ReUse<span style={{ color: "#79a94b" }}>Hub</span>
          </h1>
          <p style={{ textAlign: "center", color: "#666" }}>
            Give products a second life.
          </p>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "25px",
              marginBottom: "20px"
            }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background: authMode === "login" ? "#245c42" : "#e8eee8",
                color: authMode === "login" ? "white" : "#333"
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
                setAuthMessage("");
              }}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background:
                  authMode === "register" ? "#245c42" : "#e8eee8",
                color: authMode === "register" ? "white" : "#333"
              }}
            >
              Register
            </button>
          </div>

          <h2 style={{ textAlign: "center" }}>
            {authMode === "login"
              ? "Welcome Back!"
              : "Create Your Account"}
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "#777",
              fontSize: "14px"
            }}
          >
            {authMode === "login"
              ? "Login to continue to ReUseHub."
              : "Join our sustainable community."}
          </p>

          <form onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <>
                <label style={labelStyle}>Full Name *</label>
                <input
                  name="name"
                  value={authData.name}
                  onChange={handleAuthChange}
                  placeholder="Enter your full name"
                  required
                  style={formInputStyle}
                />
                <label style={labelStyle}>College</label>
                <input
                  name="college"
                  value={authData.college}
                  onChange={handleAuthChange}
                  placeholder="Enter your college"
                  style={formInputStyle}
                />
                <label style={labelStyle}>Location</label>
                <input
                  name="location"
                  value={authData.location}
                  onChange={handleAuthChange}
                  placeholder="Enter your location"
                  style={formInputStyle}
                />
              </>
            )}

            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              name="email"
              value={authData.email}
              onChange={handleAuthChange}
              placeholder="Enter your email"
              required
              style={formInputStyle}
            />
            <label style={labelStyle}>Password *</label>
            <input
              type="password"
              name="password"
              value={authData.password}
              onChange={handleAuthChange}
              placeholder="Enter your password"
              required
              style={formInputStyle}
            />

            {authError && (
              <p style={{ color: "red", fontSize: "14px" }}>{authError}</p>
            )}
            {authMessage && (
              <p style={{ color: "green", fontSize: "14px" }}>
                {authMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: "100%",
                padding: "13px",
                marginTop: "18px",
                border: "none",
                borderRadius: "6px",
                background: "#245c42",
                color: "white",
                fontSize: "16px",
                cursor: "pointer"
              }}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontSize: "12px",
              color: "#888"
            }}
          >
            ReUseHub | SDG 12 - Responsible Consumption
          </p>
        </div>
      </div>
    );
  }

  // MAIN APPLICATION
  return (
    <div className="app">
      {/* NAVBAR */}
      <header className="navbar">
        <a className="logo" href="#home">
          ReUse<span>Hub</span>
          <small>Give products a second life</small>
        </a>

        <nav>
          <a href="#home">Home</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#favorites">Favorites ({favorites.length})</a>
          <a href="#my-listings">My Listings</a>
          <a href="#my-requests">My Requests</a>
          <a href="#seller-requests">Seller Requests</a>
          <a href="#about">About Us</a>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px" }}>Hi, {currentUser.name}</span>
          <button className="sell-button" onClick={handleLogout}>
            Logout
          </button>
          <button
            className="sell-button"
            onClick={() => {
              setShowSellForm(true);
              setFormMessage("");
              setFormError("");
            }}
          >
            + Start Selling
          </button>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">SUSTAINABLE LIVING STARTS HERE</span>
            <h1>
              Give Pre-Loved Products
              <span> A New Purpose.</span>
            </h1>
            <p>
              Buy, sell, exchange and donate pre-owned products. Discover
              affordable treasures while contributing to a cleaner and greener
              planet.
            </p>
            <a className="hero-button" href="#marketplace">
              Explore Marketplace →
            </a>
            <div className="hero-stats">
              <div>
                <strong>Affordable</strong>
                <small>Smart shopping</small>
              </div>
              <div>
                <strong>Sustainable</strong>
                <small>Less waste</small>
              </div>
              <div>
                <strong>Community</strong>
                <small>Better together</small>
              </div>
            </div>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1000&auto=format&fit=crop&q=85"
              alt="Sustainable workspace"
            />
            <div className="image-note">
              <span>♻️</span>
              <div>
                <strong>Reuse. Renew. Repeat.</strong>
                <small>Small choices create a better future.</small>
              </div>
            </div>
          </div>
        </section>

        {/* MARKETPLACE */}
        <section className="marketplace" id="marketplace">
          <div className="section-heading">
            <div>
              <span className="eyebrow">DISCOVER GREAT FINDS</span>
              <h2>Explore Our Marketplace</h2>
              <p>Find quality pre-owned products at affordable prices.</p>
            </div>
            <span className="product-count">
              {filteredProducts.length} Products
            </span>
          </div>

          <div className="search-area">
            <input
              type="search"
              placeholder="Search desks, books, electronics..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
            >
              <option value="All">All Conditions</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
            </select>
          </div>

          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "category active" : "category"}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {loading && (
            <div className="empty-state">
              <h3>Loading products...</h3>
              <p>Connecting to the ReUseHub database.</p>
            </div>
          )}
          {error && (
            <div className="empty-state">
              <h3>Backend Connection Error</h3>
              <p>{error}</p>
              <button onClick={loadProducts}>Try Again</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="product-grid">
                {filteredProducts.map((product) => {
                  const isOwner =
                    Number(product.user?.id) === Number(currentUser.userId);
                  return (
                    <article className="product-card" key={product.id}>
                      <div className="product-image">
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                        />
                        <span className="condition-tag">
                          {product.condition}
                        </span>
                        <button
                          className={
                            favorites.includes(product.id)
                              ? "favorite selected"
                              : "favorite"
                          }
                          aria-label="Add to wishlist"
                          onClick={() => toggleFavorite(product.id)}
                        >
                          {favorites.includes(product.id) ? "♥" : "♡"}
                        </button>
                      </div>
                      <div className="product-info">
                        <span className="product-category">
                          {product.category}
                        </span>
                        <h3>{product.name}</h3>
                        <div className="product-bottom">
                          <strong>{getListingLabel(product.type)}</strong>
                          <span>
                            📍 {product.location || "Location not specified"}
                          </span>
                        </div>
                        <div className="seller">
                          <span className="seller-avatar">
                            {product.seller.charAt(0).toUpperCase()}
                          </span>
                          <span>Listed by {product.seller}</span>
                        </div>
                        <button
                          className="details-button"
                          onClick={() => setSelectedProduct(product)}
                        >
                          View Details →
                        </button>
                        {isOwner && (
                          <button
                            className="details-button"
                            onClick={() => handleDeleteItem(product.id)}
                            style={{
                              backgroundColor: "#dc3545",
                              marginTop: "8px"
                            }}
                          >
                            Delete Item
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredProducts.length === 0 && (
                <div className="empty-state">
                  <h3>No products found</h3>
                  <p>
                    No available listings match your search. Try another
                    category or add an item.
                  </p>
                  <button
                    onClick={() => {
                      setSearch("");
                      setCategory("All");
                      setCondition("All");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* FAVORITES */}
        <section
          id="favorites"
          className="marketplace"
          style={{ paddingTop: "50px", paddingBottom: "50px" }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR SAVED ITEMS</span>
              <h2>My Favorites</h2>
              <p>Products you have hearted in the marketplace.</p>
            </div>
            <span className="product-count">{favoriteProducts.length} Saved</span>
          </div>

          {favoriteProducts.length > 0 ? (
            <div className="product-grid">
              {favoriteProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    <img src={product.image} alt={product.name} loading="lazy" />
                    <span className="condition-tag">{product.condition}</span>
                    <button
                      className="favorite selected"
                      aria-label="Remove from favorites"
                      onClick={() => toggleFavorite(product.id)}
                    >
                      ♥
                    </button>
                  </div>
                  <div className="product-info">
                    <span className="product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <div className="product-bottom">
                      <strong>{getListingLabel(product.type)}</strong>
                      <span>📍 {product.location || "Location not specified"}</span>
                    </div>
                    <button
                      className="details-button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      View Details →
                    </button>
                    <button
                      className="details-button"
                      onClick={() => toggleFavorite(product.id)}
                      style={{ marginTop: "8px", backgroundColor: "#777" }}
                    >
                      Remove from Favorites
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No favorites yet</h3>
              <p>Go to Marketplace and tap the heart on a product to save it here.</p>
              <a className="hero-button" href="#marketplace">Browse Marketplace →</a>
            </div>
          )}
        </section>

        {/* MY LISTINGS */}
        <section
          id="my-listings"
          className="marketplace"
          style={{ paddingTop: "50px", paddingBottom: "50px" }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR PRODUCTS</span>
              <h2>My Listings</h2>
              <p>
                View and manage every item you listed, including unavailable
                items.
              </p>
            </div>
            <button className="sell-button" onClick={loadMyListings}>
              Refresh My Listings
            </button>
          </div>

          {myListingsLoading && <p>Loading your listings...</p>}
          {myListingsError && (
            <p style={{ color: "red" }}>{myListingsError}</p>
          )}

          {!myListingsLoading && !myListingsError && (
            <div className="product-grid">
              {myListings.map((item) => {
                const isAvailable =
                  item.status?.toUpperCase() === "AVAILABLE";
                return (
                  <article
                    className="product-card"
                    key={item.id}
                    style={{ padding: "18px" }}
                  >
                    <div className="product-image">
                      <img src={item.image} alt={item.name} loading="lazy" />
                      <span className="condition-tag">
                        {item.condition}
                      </span>
                    </div>
                    <div className="product-info">
                      <span className="product-category">
                        {item.category}
                      </span>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <p>
                        <strong>Listing:</strong> {getListingLabel(item.type)}
                      </p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {item.location || "Not specified"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          style={{
                            color: isAvailable ? "green" : "#dc3545",
                            fontWeight: "600"
                          }}
                        >
                          {item.status || "UNKNOWN"}
                        </span>
                      </p>

                      <button
                        className="sell-button"
                        disabled={updatingItemId === item.id}
                        onClick={() =>
                          handleUpdateItemStatus(
                            item.id,
                            isAvailable ? "UNAVAILABLE" : "AVAILABLE"
                          )
                        }
                        style={{
                          width: "100%",
                          marginTop: "8px",
                          opacity: updatingItemId === item.id ? 0.7 : 1
                        }}
                      >
                        {updatingItemId === item.id
                          ? "Updating..."
                          : isAvailable
                          ? "Mark as Unavailable"
                          : "Mark as Available"}
                      </button>

                      <button
                        className="details-button"
                        onClick={() => handleDeleteItem(item.id)}
                        style={{
                          backgroundColor: "#dc3545",
                          marginTop: "8px",
                          width: "100%"
                        }}
                      >
                        Delete Item
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!myListingsLoading &&
            !myListingsError &&
            myListings.length === 0 && (
              <div className="empty-state">
                <h3>You have not listed any items yet</h3>
                <p>
                  Items you add using Start Selling will appear here.
                </p>
                <button
                  className="sell-button"
                  onClick={() => {
                    setShowSellForm(true);
                    setFormMessage("");
                    setFormError("");
                  }}
                >
                  + List Your First Item
                </button>
              </div>
            )}
        </section>

        {/* MY REQUESTS */}
        <section
          id="my-requests"
          className="marketplace"
          style={{ paddingTop: "50px", paddingBottom: "50px" }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">TRACK YOUR ACTIVITY</span>
              <h2>My Requests</h2>
              <p>View the items you have requested and their status.</p>
            </div>
            <button className="sell-button" onClick={loadMyRequests}>
              Refresh Requests
            </button>
          </div>

          {requestLoading && <p>Loading your requests...</p>}
          {requestError && <p style={{ color: "red" }}>{requestError}</p>}

          {!requestLoading && !requestError && (
            <div className="product-grid">
              {myRequests.map((request) => (
                <article
                  className="product-card"
                  key={request.id}
                  style={{ padding: "20px" }}
                >
                  <span className="product-category">
                    Request #{request.id}
                  </span>
                  <h3>{request.item?.name || "Unknown Item"}</h3>
                  <p>
                    Category: {request.item?.category || "Not specified"}
                  </p>
                  <p>Seller: {request.item?.user?.name || "Unknown"}</p>
                  <p>
                    Location: {request.item?.location || "Not specified"}
                  </p>
                  <p>
                    Request status:
                    <strong
                      style={{
                        marginLeft: "8px",
                        color:
                          request.status === "ACCEPTED"
                            ? "green"
                            : request.status === "REJECTED"
                            ? "red"
                            : "#b7791f"
                      }}
                    >
                      {request.status}
                    </strong>
                  </p>
                </article>
              ))}
            </div>
          )}

          {!requestLoading && !requestError && myRequests.length === 0 && (
            <div className="empty-state">
              <h3>No requests yet</h3>
              <p>
                When you request an item from the marketplace, it will appear
                here.
              </p>
            </div>
          )}
        </section>

        {/* SELLER REQUESTS */}
        <section
          id="seller-requests"
          className="marketplace"
          style={{ paddingTop: "50px", paddingBottom: "50px" }}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">MANAGE YOUR LISTINGS</span>
              <h2>Seller Requests</h2>
              <p>
                Review requests from people interested in items you listed.
              </p>
            </div>
            <button className="sell-button" onClick={loadSellerRequests}>
              Refresh Seller Requests
            </button>
          </div>

          {sellerRequestLoading && <p>Loading seller requests...</p>}
          {sellerRequestError && (
            <p style={{ color: "red" }}>{sellerRequestError}</p>
          )}

          {!sellerRequestLoading && !sellerRequestError && (
            <div className="product-grid">
              {sellerRequests.map((request) => (
                <article
                  className="product-card"
                  key={request.id}
                  style={{ padding: "20px" }}
                >
                  <span className="product-category">
                    Request #{request.id}
                  </span>
                  <h3>{request.item?.name || "Unknown Item"}</h3>
                  <p>
                    Requested by: {request.requester?.name || "Unknown User"}
                  </p>
                  <p>
                    Requester email:{" "}
                    {request.requester?.email || "Not available"}
                  </p>
                  <p>
                    Location: {request.item?.location || "Not specified"}
                  </p>
                  <p>
                    Status:{" "}
                    <strong
                      style={{
                        color:
                          request.status === "ACCEPTED"
                            ? "green"
                            : request.status === "REJECTED"
                            ? "red"
                            : "#b7791f"
                      }}
                    >
                      {request.status || "PENDING"}
                    </strong>
                  </p>

                  {(!request.status ||
                    request.status.toUpperCase() === "PENDING") && (
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "15px"
                      }}
                    >
                      <button
                        className="sell-button"
                        disabled={updatingRequestId === request.id}
                        onClick={() =>
                          handleUpdateRequestStatus(request.id, "ACCEPTED")
                        }
                      >
                        {updatingRequestId === request.id
                          ? "Updating..."
                          : "Accept"}
                      </button>
                      <button
                        className="sell-button"
                        disabled={updatingRequestId === request.id}
                        onClick={() =>
                          handleUpdateRequestStatus(request.id, "REJECTED")
                        }
                        style={{ backgroundColor: "#dc3545" }}
                      >
                        {updatingRequestId === request.id
                          ? "Updating..."
                          : "Reject"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {!sellerRequestLoading &&
            !sellerRequestError &&
            sellerRequests.length === 0 && (
              <div className="empty-state">
                <h3>No incoming requests yet</h3>
                <p>
                  Requests from other users for your listed items will appear
                  here.
                </p>
              </div>
            )}
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <span className="eyebrow">OUR PURPOSE</span>
          <h2>Make Reuse a Way of Life.</h2>
          <p>
            ReUseHub brings people together to exchange valuable pre-owned
            products, reduce unnecessary waste and encourage responsible
            consumption.
          </p>
          <div className="about-features">
            <div>♻️ <strong>Reduce Waste</strong></div>
            <div>🤝 <strong>Build Community</strong></div>
            <div>🌱 <strong>Protect Resources</strong></div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <strong>ReUseHub</strong>
        <p>Give products a second life. Build a sustainable future.</p>
        <small>© 2026 ReUseHub. All rights reserved.</small>
      </footer>

      {/* ADD ITEM MODAL */}
      {showSellForm && (
        <div
          className="modal-overlay"
          onClick={() => setShowSellForm(false)}
        >
          <div
            className="product-modal"
            style={{
              maxWidth: "520px",
              width: "92%",
              maxHeight: "90vh",
              overflowY: "auto"
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowSellForm(false)}
            >
              ×
            </button>
            <h2>List Your Item</h2>
            <p>Give your pre-loved product a new purpose!</p>

            <form onSubmit={handleAddItem}>
              <label style={labelStyle}>Product Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter product name"
                required
                style={formInputStyle}
              />

              <label style={labelStyle}>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Describe your item"
                required
                rows="3"
                style={formInputStyle}
              />

              <label style={labelStyle}>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                style={formInputStyle}
              >
                <option value="Books">Books</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
                <option value="Accessories">Accessories</option>
              </select>

              <label style={labelStyle}>Condition *</label>
              <select
                name="itemCondition"
                value={formData.itemCondition}
                onChange={handleFormChange}
                style={formInputStyle}
              >
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>

              <label style={labelStyle}>Listing Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                style={formInputStyle}
              >
                <option value="DONATE">Donate</option>
                <option value="SELL">Sell</option>
                <option value="EXCHANGE">Exchange</option>
              </select>

              <label style={labelStyle}>Location *</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                placeholder="Enter your location"
                required
                style={formInputStyle}
              />

              <p style={{ fontSize: "13px", color: "#777" }}>
                Listing as: {currentUser.name}
              </p>

              {formMessage && (
                <p style={{ color: "green" }}>{formMessage}</p>
              )}
              {formError && <p style={{ color: "red" }}>{formError}</p>}

              <button
                type="submit"
                className="sell-button"
                disabled={submitting}
                style={{ width: "100%", marginTop: "15px" }}
              >
                {submitting ? "Listing..." : "Submit Listing"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="product-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <img
              src={selectedProduct.image}
              alt={selectedProduct.name}
              style={{
                width: "100%",
                maxHeight: "250px",
                objectFit: "cover",
                borderRadius: "10px"
              }}
            />

            <span className="product-category">
              {selectedProduct.category}
            </span>
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description}</p>
            <p>
              <strong>Condition:</strong> {selectedProduct.condition}
            </p>
            <p>
              <strong>Listing:</strong>{" "}
              {getListingLabel(selectedProduct.type)}
            </p>
            <p>
              <strong>Seller:</strong> {selectedProduct.seller}
            </p>
            <p>
              <strong>Location:</strong>{" "}
              {selectedProduct.location || "Not specified"}
            </p>

            {Number(selectedProduct.user?.id) !==
              Number(currentUser.userId) && (
              <button
                className="sell-button"
                onClick={handleContactSeller}
                style={{ width: "100%", marginTop: "15px" }}
              >
                Contact Seller / Request Item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
