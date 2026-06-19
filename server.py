import os
import stripe
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from stripe import error as stripe_error
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from firebase_admin import credentials, initialize_app, firestore
from dotenv import load_dotenv
import json
import re

# ✅ Charger les variables d'environnement
ENV_PATH = os.path.join("file", "file.env")

if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
elif os.path.exists(".env"):
    load_dotenv(".env")
else:
    load_dotenv()

# ✅ Configuration Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# ✅ Firebase
FIREBASE_KEY_PATH = os.getenv("FIREBASE_ADMIN_KEY_PATH")
FIREBASE_JSON = os.getenv("FIREBASE_JSON")

db = None
try:
    if FIREBASE_JSON:
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        initialize_app(cred)
        db = firestore.client()
        print("Firebase initialisé avec succès via la variable JSON.")
        
    elif FIREBASE_KEY_PATH and os.path.exists(FIREBASE_KEY_PATH):
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        initialize_app(cred)
        db = firestore.client()
        print("Firebase initialisé avec succès en local via le fichier de clés.")
        
    else:
        print("Firebase non configuré (clés manquants)")
except Exception as e:
    print(f"Erreur d'initialisation Firebase: {str(e)}")
    db = None


# ✅ Flask app
app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static",
)

app.config["PROPAGATE_EXCEPTIONS"] = True


@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    return traceback.format_exc(), 500, {"Content-Type": "text/plain; charset=utf-8"}


# ✅ Set proper MIME types for JavaScript modules
@app.after_request
def set_content_type_header(response):
    return response

# ✅ Enable CORS for webhooks only (restricted origins)
ALLOWED_ORIGINS = [
    "http://localhost:8000",
    "http://localhost:3000",
    "https://hooks.stripe.com",
]

CORS(app, 
     resources={
         r"/*": {
             "origins": ALLOWED_ORIGINS,
             "allow_headers": ["Content-Type", "Authorization", "Stripe-Signature"],
             "methods": ["GET", "POST", "OPTIONS"],
             "supports_credentials": True
         }
     }
)

YOUR_DOMAIN = os.getenv("YOUR_DOMAIN", "http://localhost:8000")

# ✅ Produits avec prix stockés côté serveur (SÉCURITÉ)
PRODUCTS_DB = {
    "bonnet": {"title": "Bonnets", "price": 20.00, "format": "Standard"},
    "chouchou": {"title": "Élastique en satin", "price": 12.00, "format": "Standard"},
    "perruque": {"title": "Perruque", "price": 200.00, "format": "Lace Curly"},
    "parfum": {"title": "Parfum", "price": {"Petit format": 15.00, "Grand format": 20.00}},
    "crochet": {"title": "Vêtements faits maison", "price": 50.00, "format": "Standard"},
}


# ✅ Validation email
def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


# ✅ Construire les produits Stripe avec validation
def build_line_items(cart):
    if not cart or not isinstance(cart, list):
        raise ValueError("Panier invalide")

    if len(cart) > 20:
        raise ValueError("Panier trop volumineux")

    line_items = []

    for item in cart:
        product_id = item.get("product_id")
        
        format_selected = item.get("format", "Standard")

        try:
            quantity = int(item.get("quantity", 1))
        except (ValueError, TypeError):
            raise ValueError("Quantité invalide")

        if product_id not in PRODUCTS_DB:
            raise ValueError(f"Produit invalide: {product_id}")

        if quantity < 1 or quantity > 100:
            raise ValueError("Quantité invalide")

        product = PRODUCTS_DB[product_id]
        
        # ✅ Déterminer le prix basé sur le format
        product_price = product.get("price")
        if isinstance(product_price, dict):
            # Pour les produits avec prix par format (ex: parfum)
            if format_selected not in product_price:
                raise ValueError(f"Format invalide pour {product_id}: {format_selected}")
            unit_price = product_price[format_selected]
        else:
            # Pour les produits avec prix fixe
            unit_price = product_price

        if unit_price is None:
            raise ValueError(f"Prix non trouvé pour {product_id} avec format {format_selected}")
        # ✅ PRIX VIENT DU SERVEUR (pas du client!)
        line_items.append({
            "price_data": {
                "currency": "cad",
                "product_data": {
                    "name": product["title"],
                    "description": format_selected
                },
                "unit_amount": int(unit_price * 100 * 1.15),  # TVQ 15%
            },
            "quantity": quantity,
        })

    return line_items


# ✅ Route Checkout Stripe
@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    try:
        data = request.get_json(silent=True) or {}

        cart = data.get("cart", [])
        email = data.get("customer_email")
        name = data.get("customer_name", "").strip()
        user_id = data.get("user_id")

        # ✅ Validations
        if not cart:
            return jsonify({"error": "Panier vide"}), 400

        if not email or not is_valid_email(email):
            return jsonify({"error": "Email invalide"}), 400

        if not name:
            return jsonify({"error": "Nom requis"}), 400

        # ✅ Construire la session avec les prix du serveur
        session = stripe.checkout.Session.create(
            line_items=build_line_items(cart),
            mode="payment",
            success_url=YOUR_DOMAIN + "/success.html",
            cancel_url=YOUR_DOMAIN + "/cancel.html",
            customer_email=email,
            metadata={
                "customer_name": name,
                "user_id": user_id or "",
                "cart": json.dumps(cart),
            },
        )

        return jsonify({"url": session.url}), 200

    except ValueError as e:
        print(f"Validation Error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except stripe_error.StripeError as e:
        print(f"Stripe Error: {str(e)}")
        return jsonify({"error": "Erreur de paiement. Veuillez réessayer."}), 400
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        return jsonify({"error": "Une erreur est survenue"}), 500


# ✅ 🔥 WEBHOOK Stripe (TRÈS IMPORTANT)
@app.route("/webhook", methods=["POST"])
def stripe_webhook():
    print("=" * 50)
    print("🔔 WEBHOOK REÇU!")
    print("=" * 50)

    try:
        payload = request.data
        sig_header = request.headers.get("Stripe-Signature")
        print(f"Signature header reçue: {sig_header[:20] if sig_header else 'RIEN'}...")

        endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        print(f"Secret configuré: {endpoint_secret[:20] if endpoint_secret else 'RIEN'}...")

        if not endpoint_secret:
            print("❌ ERREUR: STRIPE_WEBHOOK_SECRET non configuré")
            return jsonify({"error": "Webhook non configuré"}), 500

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
            print(f"✅ Événement Stripe vérifié: {event['type']}")
        except ValueError as e:
            print(f"❌ ValueError: {str(e)}")
            return jsonify({"error": "Invalid payload"}), 400
        except stripe_error.SignatureVerificationError as e:
            print(f"❌ SignatureVerificationError: {str(e)}")
            return jsonify({"error": "Invalid signature"}), 400

        # ✅ Paiement réussi
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]

            print("🔍 SESSION REÇUE")

            # ✅ Accéder aux propriétés directement
            metadata = session.metadata or {}
            name = getattr(metadata, "customer_name", None)
            user_id = getattr(metadata, "user_id", None)
            cart_str = getattr(metadata, "cart", None)

            # ✅ email
            email = (
                session.customer_details.email
                if session.customer_details else None
            )

            try:
                cart = json.loads(cart_str) if cart_str else []
            except Exception:
                cart = []

            print("EMAIL:", email)
            print("USER:", user_id)

            if db:
                try:
                    db.collection("orders").add({
                        "user_id": user_id or None,
                        "email": email,
                        "customer_name": name,
                        "cart": cart,
                        "stripe_session_id": session.id,
                        "status": "paid",
                        "created_at": SERVER_TIMESTAMP
                    })
                    print("✅ COMMANDE SAUVEGARDÉE")
                except Exception as e:
                    print("❌ ERREUR FIREBASE:", e)
            else:
                print("⚠️ Firebase non configuré")

        print("✅ Webhook traité avec succès")
        print("=" * 50)
        return jsonify({"status": "success"}), 200

    except Exception as e:
        print(f"❌ ERREUR GÉNÉRALE: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ✅ API Route pour les produits (publique)
@app.route("/api/products", methods=["GET"])
def get_products():
    return jsonify(PRODUCTS_DB), 200


# ✅ Pages
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/success.html")
def success():
    return render_template("success.html")


@app.route("/cancel.html")
def cancel():
    return render_template("cancel.html")


# ✅ Lancer serveur
if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=8000)
