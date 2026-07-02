import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-check.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB4Zej0idZ2l-jZbA19jyXQ-1A0Du73CRg",
  authDomain: "projetboutiquestephanie.firebaseapp.com",
  projectId: "projetboutiquestephanie",
  storageBucket: "projetboutiquestephanie.firebasestorage.app",
  messagingSenderId: "2624899186",
  appId: "1:2624899186:web:0dd25d388e0e3036aedaeb",
  measurementId: "G-D189JD2PLJ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let currentUser = null;

const shopping = document.querySelector(".shopping");
const shopBtns = document.querySelectorAll(".product a");
const menuBag = document.querySelector(".menu_bag");

const form = document.querySelector(".shopping_form");
const shopTitle = document.querySelector(".shopping_form h2");
const shopPrice = document.querySelector(".shopping_form h3");
const shopFormatContainer = document.querySelector(".format_container");
const shopFormBtn = document.querySelector(".shopping_btn");
const quantityInput = document.querySelector(".quantity_input");

const imgGalleryContainer = document.querySelector(".img_gallery");
const imgGallery = document.querySelector(".img_gallery img");
const imgPopUp = document.querySelector(".img_pop_up img");

const idBtn = document.querySelector(".auth_btn");

const basket = document.querySelector(".basket");
const basketExit = document.querySelector(".basket_exit span");
const authBox = document.querySelector(".authBox");
const basketContainer = document.querySelector(".basket_container");

const continueShopping = document.querySelector(".continue_shopping");
const basketToggleBtn = document.querySelector(".price_container button");
const estimedTotal = document.querySelector(".estimed_total h3");
const subTotalTitle = document.querySelector(".price_recap h3");
const taxesTitle = document.querySelector(".price_tax h3");
const totalElementTitle = document.querySelector(".price_total h3");
const subTotal = document.querySelector(".price_recap h4");
const taxes = document.querySelector(".price_tax h4");
const totalElement = document.querySelector(".price_total h4");

const authTitle = document.getElementById("authTitle");
const authBtn = document.getElementById("authActionBtn");
const toggleAuth = document.getElementById("toggleAuth");

const firstNameInput = document.querySelector(".first_name");
const lastNameInput = document.querySelector(".last_name");
const emailInput = document.querySelector("#auth_email");
const passwordInput = document.querySelector("#auth_password");
const passwordToggle = document.querySelector(".pwd_container i");

const toTop = document.getElementById("go_to_top");

const products = {
  bonnet: {
    title: "Bonnets",
    price: "20",
    format: "Standard",
    images: ["/static/img/Bonnet.JPEG"],
  },
  chouchou: {
    title: "Élastique en satin",
    price: "12",
    format: "Standard",
    images: ["/static/img/chouchou.JPEG"],
  },
  perruque: {
    title: "Perruque",
    price: "200",
    format: "Lace Curly",
    images: ["/static/img/LACE_Curly.webp"],
  },
  parfum: {
    title: "Parfum",
    price: ["15", "20"],
    format: ["Petit format", "Grand format"],
    images: ["/static/img/Parfum_pf.png", "/static/img/parfum_gf.png"],
  },
  crochet: {
    title: "Vêtements faits maison",
    price: "50",
    format: "Standard",
    images: ["/static/img/crochet.JPEG"],
  },
};
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let isLogin = true;
let formState = {
  productKey: null,
  format: null,
  quantity: 1,
  price: 0,
};

try {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
    ),
    isTokenAutoRefreshEnabled: true,
  });
  console.log("App Check initialized");
} catch (error) {
  console.warn("App Check error (might be debug token):", error.message);
}

shopFormBtn.addEventListener("click", (e) => {
  e.preventDefault();
  basket.style.right = "0";
  addToCart();
});

shopBtns.forEach((btn, index) => {
  btn.addEventListener("click", () => {
    if (shopping.style.display === "flex") {
      shopping.style.display = "none";
    } else {
      shopping.style.display = "flex";
      selectionProduct(index);
    }
  });
});

const selectionProduct = (index) => {
  const productKey = Object.keys(products);
  const key = productKey[index];

  quantityInput.value = 1;
  formState.quantity = 1;
  formState.productKey = key;

  shopTitle.textContent = products[key].title;
  imgGallery.src = products[key].images[0];
  imgPopUp.src = products[key].images[0];

  imgGalleryContainer.innerHTML = "";
  products[key].images.forEach((src, i) => {
    const thumbnail = document.createElement("img");
    thumbnail.src = src;
    if (i === 0) {
      imgGallery.src = src;
      imgPopUp.src = src;
    }
    thumbnail.addEventListener("click", () => {
      imgPopUp.src = src;
    });
    imgGalleryContainer.appendChild(thumbnail);
  });

  // On vide TOUJOURS le conteneur de formats avant de le reconstruire
  shopFormatContainer.innerHTML = "";

  if (Array.isArray(products[key].format)) {
    // Initialisation par défaut avec la première option du tableau
    formState.format = products[key].format[0];
    formState.price = parseFloat(products[key].price[0]);
    shopPrice.textContent = "Prix: " + products[key].price[0] + " $";

    products[key].format.forEach((format, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = format;

      btn.addEventListener("click", () => {
        formState.format = format;
        formState.price = parseFloat(products[key].price[i]);
        shopPrice.textContent = "Prix: " + formState.price + " $";

        // Gestion de la couleur active directement ici pour éviter les bugs
        document
          .querySelectorAll(".format_container button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });

      li.appendChild(btn);
      shopFormatContainer.appendChild(li);
    });
  } else {
    // Si c'est un format unique (chaîne de caractères)
    formState.format = products[key].format;
    formState.price = parseFloat(products[key].price);
    shopPrice.textContent = "Prix: " + products[key].price + " $";

    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = formState.format;

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".format_container button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });

    li.appendChild(btn);
    shopFormatContainer.appendChild(li);
  }
};

const addToCart = () => {
  if (!formState.productKey || !formState.format) {
    alert("Veuillez sélectionner un produit et son format!");
    return;
  }

  const product = products[formState.productKey];

  const item = {
    id: Date.now(), // ID unique basé sur le timestamp
    product_id: formState.productKey,
    name: product.title,
    price: formState.price,
    quantity: formState.quantity,
    format: formState.format,
    image: product.images[0],
  };

  const existing = cart.find(
    (p) => p.id === item.id && p.format === item.format,
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }

  updateCartUI();
  localStorage.setItem("cart", JSON.stringify(cart));

  console.log("Panier :", cart);
};

const updateCartUI = () => {
  basketContainer.innerHTML = "";

  const cartList = document.createElement("ul");

  let total = 0;
  if (!cart.length) {
    basketContainer.innerHTML = "<p>Le panier est vide</p>";
    estimedTotal.textContent = "";
    idBtn.style.display = "none";
    subTotalTitle.textContent = "Sous-Total ";
    subTotal.textContent = "0 $";
    taxesTitle.textContent = "Taxes (15%) : ";
    taxes.textContent = "0 $";
    totalElementTitle.textContent = "Total : ";
    totalElement.textContent = "0 $";

    localStorage.setItem("cart", JSON.stringify(cart));
    return;
  }

  cart.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("basket_item");
    idBtn.style.display = "flex";
    idBtn.disabled = false;
    idBtn.style.opacity = "1";
    idBtn.style.cursor = "pointer";

    const itemSection = document.createElement("section");

    itemSection.classList.add("item_img");
    const itemImg = document.createElement("img");
    itemImg.src = item.image;
    itemImg.alt = item.name;
    itemImg.classList.add("item_img");

    const itemInfo = document.createElement("section");
    itemInfo.classList.add("item_description");

    const title = document.createElement("h3");
    title.textContent = item.name;

    const format = document.createElement("h4");
    format.classList.add("item_format");
    format.textContent = item.format;

    const price = document.createElement("h4");
    price.classList.add("item_price");
    price.textContent = item.price + " $";

    const qtyLabel = document.createElement("label");
    qtyLabel.setAttribute("for", "quantity");
    qtyLabel.textContent = "Quantité:";
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "1";
    qtyInput.value = item.quantity;
    qtyInput.classList.add("qty_input");
    qtyInput.dataset.id = item.id;

    const removeBtn = document.createElement("button");
    removeBtn.dataset.id = item.id;
    removeBtn.setAttribute("aria-label", "Retirer " + item.name);
    const removeIcon = document.createElement("i");
    removeIcon.classList.add("ri-delete-bin-line");

    total += item.price * item.quantity;

    removeBtn.appendChild(removeIcon);
    li.appendChild(itemSection);
    li.appendChild(itemInfo);
    itemSection.appendChild(itemImg);
    itemInfo.appendChild(title);
    itemInfo.appendChild(format);
    itemInfo.appendChild(price);
    itemInfo.appendChild(qtyLabel);
    itemInfo.appendChild(qtyInput);
    itemInfo.appendChild(removeBtn);
    cartList.appendChild(li);
  });

  document.querySelector(".estimed_total h3").textContent =
    "Sous-Total : " + total + " $";
  subTotalTitle.textContent = "Sous-Total ";
  subTotal.textContent = total + " $";
  taxesTitle.textContent = "Taxes (15%) : ";
  taxes.textContent = (total * 0.15).toFixed(2) + " $";
  totalElementTitle.textContent = "Total : ";
  totalElement.textContent = (total * 1.15).toFixed(2) + " $";
  localStorage.setItem("cart", JSON.stringify(cart));

  basketContainer.appendChild(cartList);
};

updateCartUI();

menuBag.addEventListener("click", () => {
  if (basket.style.right === "0") {
    basket.style.right = "-100%";
  } else {
    basket.style.right = "0";
  }
});

basketExit.addEventListener("click", () => {
  basket.style.right = "-100%";
});

basketContainer.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (!button) return;

  const id = Number(button.dataset.id);

  cart = cart.filter((item) => item.id !== id);
  updateCartUI();
});

basketContainer.addEventListener("input", (e) => {
  if (e.target.classList.contains("qty_input")) {
    const id = Number(e.target.dataset.id);

    let newQty = parseInt(e.target.value);

    if (newQty < 1 || isNaN(newQty)) {
      newQty = 1;
      e.target.value = 1;
    }

    const item = cart.find((p) => p.id === id);
    if (item) {
      item.quantity = newQty;
    }

    updateCartUI();
  }
});

toggleAuth.addEventListener("click", () => {
  isLogin = !isLogin;

  if (isLogin) {
    authTitle.textContent = "Se connecter";
    authBtn.textContent = "Se connecter";
    toggleAuth.innerHTML = "Pas de compte ? <span>Créer un compte</span>";
  } else {
    authTitle.textContent = "S’inscrire";
    authBtn.textContent = "S’inscrire";
    toggleAuth.innerHTML = "Déjà inscrit ? <span>Se connecter</span>";
  }
});

authBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  const firstname = firstNameInput.value.trim();
  const lastname = lastNameInput.value.trim();
  const email = document.getElementById("auth_email").value;
  const password = document.getElementById("auth_password").value;

  if (!firstname || !lastname || !email || !password) {
    alert("Veuillez remplir les champs ci-contre !");
    return;
  }

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Utilisateur connecté");
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log("Compte créé");
    }
    // On attend 500ms pour que Firebase mette à jour currentUser
    await new Promise((resolve) => setTimeout(resolve, 500));
    checkout(firstname, lastname, email);
  } catch (error) {
    alert("Erreur: " + error.message);
  }
});

const checkout = async (firstname, lastname, email) => {
  if (!cart.length) {
    alert("Le panier est vide");
    return;
  }
  if (!lastname || !email || !firstname) {
    alert("Veuillez remplir les informations");
    return;
  }

  try {
    const response = await fetch("/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cart: cart,
        customer_email: email,
        customer_name: `${firstname} ${lastname}`,
        user_id: currentUser ? currentUser.uid : null,
      }),
    });

    const data = await response.json();

    if (data.error) {
      alert("Erreur: " + data.error);
      return;
    }

    // Rediriger vers Stripe Checkout
    window.location.href = data.url;
  } catch (error) {
    console.error("Erreur:", error);
    alert("Erreur lors du paiement");
  }
};

onAuthStateChanged(auth, (user) => {
  currentUser = user;
});

const changeBtnColor = (btns) => {
  btns.addEventListener("click", () => {
    document
      .querySelectorAll(".format_container button")
      .forEach((btn) => btn.classList.remove("active"));
    btns.classList.add("active");
  });
};

quantityInput.addEventListener("input", (e) => {
  let value = parseInt(e.target.value);

  if (isNaN(value) || value < 1) value = 1;

  formState.quantity = value;
});

const clearCart = () => {
  cart = [];
  updateCartUI();
};

passwordToggle.addEventListener("click", () => {
  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordToggle.classList = "ri-eye-line";
  } else {
    passwordInput.type = "password";
    passwordToggle.classList = "ri-eye-off-line";
  }
});

idBtn.addEventListener("click", () => {
  if (!cart.length) return;
  basket.style.right = "-200%";
  authBox.style.top = "0";
});

continueShopping.addEventListener("click", () => {
  authBox.style.top = "-200%";
});

basketToggleBtn.addEventListener("click", () => {
  basket.style.right = "0";
});

window.addEventListener("scroll", () => {
  if (window.scrollY > 300 && window.scrollY < 2500) {
    toTop.style.opacity = "1";
  } else {
    toTop.style.opacity = "0";
  }
});

toTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
  });
});
