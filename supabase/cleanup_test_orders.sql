-- Preview the test orders to be deleted
SELECT id, customer_name, total_amount, created_at, status, cancel_reason
FROM orders
WHERE customer_name LIKE '%TEST ORDER - IGNORE%';

-- Delete test orders and their associated order_items and push_subscriptions (Assuming ON DELETE CASCADE is set, otherwise delete sequentially)
DELETE FROM push_subscriptions 
WHERE order_id IN (
  SELECT id FROM orders WHERE customer_name LIKE '%TEST ORDER - IGNORE%'
);

DELETE FROM order_items 
WHERE order_id IN (
  SELECT id FROM orders WHERE customer_name LIKE '%TEST ORDER - IGNORE%'
);

DELETE FROM orders 
WHERE customer_name LIKE '%TEST ORDER - IGNORE%';
