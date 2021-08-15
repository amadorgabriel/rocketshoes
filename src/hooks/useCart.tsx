import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart =  localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const cartArray = [...cart]

      const productFound = cartArray.find(product => {
        return product.id === productId;
      })
      
      const stock = await api.get(`stock/${productId}`)
      const maxAmount = stock.data.amount
      const currentAmount = productFound ? productFound.amount + 1 : 1
      
      if(currentAmount > maxAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      if(productFound) {
        productFound.amount = currentAmount
      } else {
        const { data } = await api.get(`products/${productId}`)

        const productItem: Product = {
          ...data,
          amount: currentAmount
        }

        cartArray.push(productItem)
      }

      setCart(cartArray)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartArray))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartArray = [...cart]
      const updatedCart = cartArray.filter(product => product.id !== productId)

      const productExists = cartArray.findIndex(product => product.id === productId)
      if(productExists === -1) throw new Error() // -1 não encontrado

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if( amount <= 0 ) return

      const cartArray = [...cart]
      const stock = await api.get(`stock/${productId}`);
      const maxAmount = stock.data.amount 

      if(amount > maxAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cartArray.map((cartItem) => {
        if(cartItem.id === productId) {
          const productFound = {
            ...cartItem,
            amount: amount
          }

          return productFound;
        }

        return cartItem;
      })

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
