import re

with open('run_seed_fetch.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('console.log("Deleting old menu items...");', '''console.log("Deleting orders...");
  await fetch(`${URL}/rest/v1/order_items?id=not.eq.0`, { method: 'DELETE', headers });
  await fetch(`${URL}/rest/v1/orders?id=not.eq.temp`, { method: 'DELETE', headers });
  console.log("Deleting old menu items...");''')

with open('run_seed_fetch.js', 'w', encoding='utf-8') as f:
    f.write(content)
