const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);

const CART_KEY = "studiom_warm_cart";
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

const overlay = document.getElementById("overlay");
const drawer = document.getElementById("cartDrawer");
const cartItems = document.getElementById("cartItems");
const emptyCart = document.getElementById("emptyCart");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartCount = document.getElementById("cartCount");
const toast = document.getElementById("toast");

function saveCart(){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function subtotal(){
  return cart.reduce((sum,item) => sum + item.price, 0);
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function renderCart(){
  cartCount.textContent = cart.length;
  cartSubtotal.textContent = money(subtotal());

  if(!cart.length){
    cartItems.innerHTML = "";
    emptyCart.classList.add("show");
    return;
  }

  emptyCart.classList.remove("show");

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}">
      <div>
        <h3>${item.name}</h3>
        <p>${item.size}</p>
        <strong>${money(item.price)}</strong>
      </div>
      <button class="remove" data-remove="${item.id}">×</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      cart = cart.filter(item => item.id !== btn.dataset.remove);
      saveCart();
      renderCart();
    });
  });
}

function openCart(){
  drawer.classList.add("open");
  overlay.classList.add("open");
  document.body.classList.add("locked");
}

function closeCart(){
  drawer.classList.remove("open");
  overlay.classList.remove("open");
  if(!document.getElementById("checkoutModal").classList.contains("open")){
    document.body.classList.remove("locked");
  }
}

document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);

document.getElementById("continueShopping").addEventListener("click", () => {
  closeCart();
  document.getElementById("works").scrollIntoView({behavior:"smooth"});
});

document.querySelectorAll(".add-cart").forEach(btn => {
  btn.addEventListener("click", () => {
    const item = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: Number(btn.dataset.price),
      size: btn.dataset.size,
      image: btn.dataset.image
    };

    if(cart.find(x => x.id === item.id)){
      showToast("Already in cart");
      openCart();
      return;
    }

    cart.push(item);
    saveCart();
    renderCart();
    showToast("Added to cart");
  });
});

/* Artwork modal */

const artModal = document.getElementById("artModal");
const artModalImage = document.getElementById("artModalImage");
const artModalTitle = document.getElementById("artModalTitle");

document.querySelectorAll(".open-art").forEach(btn => {
  btn.addEventListener("click", () => {
    artModalImage.src = btn.dataset.image;
    artModalTitle.textContent = btn.dataset.title;
    artModal.classList.add("open");
    document.body.classList.add("locked");
  });
});

function closeArt(){
  artModal.classList.remove("open");
  document.body.classList.remove("locked");
}

document.getElementById("closeArtModal").addEventListener("click", closeArt);
artModal.addEventListener("click", e => {
  if(e.target === artModal) closeArt();
});

/* Checkout */

const checkoutModal = document.getElementById("checkoutModal");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");

function renderCheckout(){
  checkoutItems.innerHTML = cart.map(item => `
    <div class="checkout-line">
      <strong>${item.name}</strong>
      <span>${money(item.price)}</span>
    </div>
  `).join("");

  checkoutTotal.textContent = money(subtotal());
}

function openCheckout(){
  if(!cart.length) return;
  closeCart();
  renderCheckout();
  checkoutModal.classList.add("open");
  document.body.classList.add("locked");
}

function closeCheckout(){
  checkoutModal.classList.remove("open");
  document.body.classList.remove("locked");
}

document.getElementById("checkoutButton").addEventListener("click", openCheckout);
document.getElementById("closeCheckout").addEventListener("click", closeCheckout);

checkoutModal.addEventListener("click", e => {
  if(e.target === checkoutModal) closeCheckout();
});

/* Razorpay-ready payment flow */

document.getElementById("checkoutForm").addEventListener("submit", async event => {
  event.preventDefault();

  if(!cart.length) return;

  const formData = new FormData(event.currentTarget);
  const customer = Object.fromEntries(formData.entries());

  try{
    const response = await fetch("/api/create-order", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        amount: subtotal(),
        customer,
        items: cart
      })
    });

    const data = await response.json();

    if(!response.ok){
      throw new Error(data.error || "Could not create payment order");
    }

    if(!window.Razorpay){
      throw new Error("Razorpay Checkout did not load.");
    }

    const options = {
      key: data.key,
      amount: data.order.amount,
      currency: data.order.currency,
      name: "StudioM by Manya Mehrotra",
      description: "Original artwork purchase",
      order_id: data.order.id,

      prefill:{
        name:customer.name,
        email:customer.email,
        contact:customer.phone
      },

      theme:{
        color:"#b86f52"
      },

      handler: async function(paymentResponse){
        const verify = await fetch("/api/verify-payment", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(paymentResponse)
        });

        const result = await verify.json();

        if(result.ok){
          cart = [];
          saveCart();
          renderCart();
          closeCheckout();
          showToast("Payment successful");
        }else{
          showToast("Payment verification failed");
        }
      }
    };

    new Razorpay(options).open();

  }catch(error){
    console.error(error);
    showToast(error.message);
  }
});

document.addEventListener("keydown", event => {
  if(event.key === "Escape"){
    closeCart();
    closeCheckout();
    closeArt();
  }
});

renderCart();
