import os

types_path = "src/types.ts"
if os.path.exists(types_path):
    with open(types_path, "r", encoding="utf8") as f:
        code = f.read()

    new_cart_item = """export interface CartItem {
  menu_item_id: string;
  name: string;
  image_url: string;
  quantity: number;
  price: number;
  variants: ItemVariant[];
}"""

    code = code.replace("""export interface CartItem {
  menu_item_id: string;
  quantity: number;
  price: number;
  variants: ItemVariant[];
}""", new_cart_item)
    
    with open(types_path, "w", encoding="utf8") as f:
        f.write(code)
