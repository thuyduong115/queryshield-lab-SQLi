"""Fixed SQL shared by both shop implementations: only value handling differs."""

PRODUCT_COLUMNS = "SELECT id, name, category, price, published FROM demo.products"
ORDER_COLUMNS = "SELECT id, customer_name, item, total, visibility FROM demo.orders"
SEARCH_SQL = PRODUCT_COLUMNS + " WHERE name ILIKE %s AND published = true ORDER BY id LIMIT 20"
ORDER_SQL = (
    ORDER_COLUMNS + " WHERE customer_name = %s AND visibility = 'public' ORDER BY id LIMIT 20"
)
SAVE_PROFILE_SQL = (
    "INSERT INTO demo.profiles (id, customer_name) VALUES (%s, %s) "
    "RETURNING id::text, customer_name"
)
READ_PROFILE_SQL = "SELECT customer_name FROM demo.profiles WHERE id = %s"


def search_products(conn, term: str) -> list[dict]:
    return conn.execute(SEARCH_SQL, ("%" + term + "%",)).fetchall()


def customer_orders(conn, customer_name: str) -> list[dict]:
    return conn.execute(ORDER_SQL, (customer_name,)).fetchall()
