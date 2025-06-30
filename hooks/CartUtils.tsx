import { supabase } from '@/supabaseClient';
import Toast from 'react-native-toast-message';

export const handleAddToCart = async (product: any, quantity: number, userId: string, locationId: string) => {
  try {
    // Step 1: Check if an active order exists for the user
    const { data: existingOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let orderId;

    if (orderError || !existingOrder) {
      // If no active order exists, create a new one
      const { data: newOrder, error: newOrderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: userId,
            status: 'active',
            total_amount: 0,
            location_id: locationId,
          },
        ])
        .select()
        .single();

      if (newOrderError) {
        console.error('Error creating new order:', newOrderError);
        Toast.show({ type: "error", text1: 'Failed to create a new order.' });
        return false;
      }

      orderId = newOrder.id;
    } else {
      // Use the existing active order
      orderId = existingOrder.id;
    }

    // Step 2: Add the item to the order_items table
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .insert([
        {
          order_id: orderId,
          product_id: product.id,
          quantity: quantity,
          unit_price: product.price, // updated field name
          // variable_prep_time: ... // add if you have this info
          created_at: new Date().toISOString(),
        },
      ]);

    if (orderItemError) {
      console.error('Error adding item to order_items:', orderItemError);
      Toast.show({ type: "error", text1: 'Failed to add item to cart.' });
      return false;
    }

    // Step 3: Update the total amount of the order
    const updatedTotalAmount = (existingOrder?.total_amount || 0) + product.price * quantity;

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ total_amount: updatedTotalAmount })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('Error updating order total amount:', updateOrderError);
      Toast.show({ type: "error", text1: 'Failed to update order total.' });
      return false;
    }

    Toast.show({ type: "success", text1: `${quantity} ${product.name} added to cart!` });
    return true;
  } catch (error) {
    console.error('Unexpected error adding to cart:', error);
    Toast.show({ type: "error", text1: 'An unexpected error occurred.' });
    return false;
  }
};