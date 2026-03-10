import sqlite3
import os

db_path = r'C:\Users\lenovo\OneDrive\Documents\db\data\restaurant_pos.db'
if not os.path.exists(db_path):
    print(f"DB NOT FOUND at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
print('--- STATIONS ---')
print('--- ALL STATIONS ---')
print(conn.execute('SELECT * FROM printer_stations').fetchall())

search_name = "CHINESE"
chinese_station = conn.execute('SELECT * FROM printer_stations WHERE station_name LIKE ?', (f'%{search_name}%',)).fetchall()
print(f'--- CHINESE STATION SEARCH Result ---')
print(chinese_station)

print('--- MAP ---')
print(conn.execute('SELECT * FROM category_station_map').fetchall())

print('--- RECENT ORDERS ---')
print(conn.execute('SELECT id, order_number, created_at FROM orders ORDER BY created_at DESC LIMIT 5').fetchall())

order_no = "260309008"
order = conn.execute('SELECT id FROM orders WHERE order_number = ?', (order_no,)).fetchone()
if not order:
    order = conn.execute('SELECT id FROM orders WHERE CAST(order_number AS TEXT) = ?', (order_no,)).fetchone()

if order:
    order_id = order[0]
    items = conn.execute('''
        SELECT oi.item_name, mi.category_id, c.name as category_name, csm.station_id
        FROM order_items oi
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        LEFT JOIN categories c ON mi.category_id = c.id
        LEFT JOIN category_station_map csm ON c.id = csm.category_id
        WHERE oi.order_id = ?
    ''', (order_id,)).fetchall()
    print(items)
else:
    print('Order not found even as string')
