with open('src/components/orders/OrderTracker.tsx', 'r', encoding='utf-8') as f:
    tracker = f.read()

tracker = tracker.replace(
    "const [isOpen, setIsOpen] = useState(false);",
    "const [isOpen, setIsOpen] = useState(false);\n  const [hasOpenedAuto, setHasOpenedAuto] = useState(false);"
)

auto_open = """
  // Auto open for brand new orders
  useEffect(() => {
    if (order && !hasOpenedAuto) {
      const start = new Date(order.created_at).getTime();
      const elapsed = (Date.now() - start) / 60000;
      if (elapsed < 1 && order.status === 'received') {
        setIsOpen(true);
        setHasOpenedAuto(true);
      }
    }
  }, [order, hasOpenedAuto]);
"""

tracker = tracker.replace(
    "if (!orderId || !order) return null;",
    auto_open + "\n  if (!orderId || !order) return null;"
)

with open('src/components/orders/OrderTracker.tsx', 'w', encoding='utf-8') as f:
    f.write(tracker)
