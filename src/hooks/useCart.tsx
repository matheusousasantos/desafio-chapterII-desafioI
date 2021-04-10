import { createContext, ReactNode, useContext, useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // 1 - se o produto existe pra encrementar ou adicionar o produto
      // 2 - se existe o produto no estoque produto

      const updatedCart = [...cart]; // Novo array com os valores de carts. x[ updatedCart = cart - Aponta pra mesma referência ]

      const productExists = updatedCart.find(product => product.id === productId); // Vai encontrar produto com esse mesmo ID.


      // Verificar no estoque
      // Se o produto já existe no stock
      const stock = await api.get(`/stock/${productId}`);

      // Retorna a quantidade desse objeto no estoque
      const stockAmount = stock.data.amount;

      // Se o produto existe no carrinho eu pego a quantidade se não eu passo 0 e retorno.
      const currentAmount = productExists ? productExists.amount : 0;

      const amount = currentAmount + 1;


      // Se a quantidade desejada for maior que a do stock precisa dar error.
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // Se o produto existe de fato precisa 'atualizar' a quantidade de produto. ![ Não precisa atualizar o updatedCart ]
      if (productExists) {
        productExists.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        // Vamos criar um novo objecto.
        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // Verificar se ele existe no carrinho

      const updatedCart = [...cart];

      const productIndex = updatedCart.findIndex(product => product.id === productId);

      // Se o findIndex não encontrar ele retorna -1. Por isso a verificação.
      if (productIndex >= 0) {

        //splice - remove ou, se nessessário, adiciona um elementos do array. Vamos informar onde começamos a deletar e a quantidade de itens que eu quero deletar.

        // Vou apagar començando do index que eu encontrei e somente ele.
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error(); // Vai direto pro catch.
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      // Verifico se a quantidade desejada é maior que a do stock.
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExist = updatedCart.find(product => product.id === productId);

      if (productExist) {
        productExist.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }

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
