const fs = require('fs');
let code = fs.readFileSync('src/components/chat/AmirBotDrawer.tsx', 'utf8');

const regex = /const processActionTags = async \(text: string\) => \{[\s\S]*?\}\s*\}\s*\};\s*\}\s*catch \(err\) \{/;

const replacement = `    } catch (err) {`;

code = code.replace(regex, replacement);

const newProcessBlock = `
      // Process server-resolved actions
      if (res.resolvedActions) {
        for (const action of res.resolvedActions) {
          if (action.type === 'ADD_CART' && action.item) {
            if (action.item.variants && action.item.variants.length > 0) {
              addToast(\`'\${action.item.name}' requires options. Please choose on the menu.\`, 'info');
              navigate({ to: '/menu' });
            } else {
              addToCart(buildCartItem(action.item, [], action.qty || 1));
              playSuccessChime();
              addToast(\`Added \${action.qty || 1}x \${action.item.name}\`, 'success');
            }
          } else if (action.type === 'NOT_FOUND') {
            addToast("Couldn't find that item.", 'error');
          } else if (action.type === 'REMOVE_CART') {
            removeItem(action.payload);
            addToast('Removed item.', 'info');
          } else if (action.type === 'CLEAR_CART') {
            clearCart();
            addToast('Cart cleared.', 'info');
          } else if (action.type === 'CHECKOUT') {
            navigate({ to: '/checkout' });
            setIsOpen(false);
          } else if (action.type === 'OPEN_MENU') {
            navigate({ to: '/menu', search: { category: action.payload } });
            setIsOpen(false);
          } else if (action.type === 'TRACK_ORDER') {
            if (activeOrderId) {
              navigate({ to: '/orders/$orderId', params: { orderId: activeOrderId } });
              setIsOpen(false);
            }
          }
        }
      }

      if (res.reply) {
        setMessages(prev => [...prev, { role: 'bot', text: res.reply }]);
      }
    } catch (err) {`;

code = code.replace(/const replyRaw = res\.reply;\s*await processActionTags\(replyRaw\);\s*const replyClean = replyRaw\.replace\(\/\\\[ACTION:\[\^\\\]\]\+\\\]\/g, ''\)\.trim\(\);\s*if \(replyClean\) \{\s*setMessages\(prev => \[\.\.\.prev, \{ role: 'bot', text: replyClean \}\]\);\s*\}\s*\} catch \(err\) \{/, newProcessBlock);

fs.writeFileSync('src/components/chat/AmirBotDrawer.tsx', code);
