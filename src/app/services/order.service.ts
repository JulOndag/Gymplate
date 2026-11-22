import { Injectable } from '@angular/core';
import { Order, OrderItem, OrderStatus, FulfillmentType, PaymentMethod } from '../models';
import { MockDataService } from './mock-data.service';
import { CartService } from './cart.service';
import { AuthService } from './auth.service';
import { CloudStoreService } from './cloud-store.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private validTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['preparing', 'cancelled'], // accepting goes straight to Preparing
    confirmed: ['preparing', 'cancelled'], // kept only for old orders
    preparing: ['ready', 'cancelled'],
    ready: ['out_for_delivery', 'completed', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered: ['completed'],
    completed: [],
    cancelled: [],
  };

  constructor(
    private mockData: MockDataService,
    private cartService: CartService,
    private authService: AuthService,
    private cloud: CloudStoreService,
  ) {}

  getOrders(): Order[] {
    return this.mockData.getOrders();
  }

  getOrder(id: string): Order | undefined {
    return this.mockData.getOrder(id);
  }

  getOrderByNumber(orderNumber: string): Order | undefined {
    return this.mockData.getOrders().find((o) => o.orderNumber === orderNumber);
  }

  getCustomerOrders(customerId: string): Order[] {
    return this.mockData.getOrdersByCustomerId(customerId);
  }

  getSellerOrders(sellerId: string): Order[] {
    return this.mockData.getOrdersBySellerId(sellerId);
  }

  /**
   * [ORDERS-FS] Places the order in Firestore. It is async now: the order and the stock
   * are saved together, so it can say "no longer available" if someone else bought the last one.
   */
  async createOrder(params: {
    fulfillmentType: FulfillmentType;
    paymentMethod: PaymentMethod;
    specialInstructions?: string;
    deliveryAddress?: string;
  }): Promise<{ success: boolean; message: string; order?: Order }> {
    const user = this.authService.user();
    if (!user) return { success: false, message: 'Please log in to place an order.' };

    const cartItems = this.cartService.cartItems();
    if (cartItems.length === 0) return { success: false, message: 'Your cart is empty.' };

    const sellerId = this.cartService.currentSellerId();
    if (!sellerId) return { success: false, message: 'Invalid cart state.' };

    const business = this.mockData.getBusinessBySellerId(sellerId);
    const seller = this.mockData.getUser(sellerId);

    // Quick check on this screen first (the real check happens in Firestore when the order is saved)
    for (const item of cartItems) {
      const product = this.mockData.getProduct(item.productId);
      if (!product || product.stock < item.quantity) {
        return {
          success: false,
          message: `${item.product.name} is no longer available in the requested quantity.`,
        };
      }
    }

    const orderItems: OrderItem[] = cartItems.map((item) => ({
      id: 'oi-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      productId: item.productId,
      productName: item.product.name,
      // Big uploaded photos are not copied into the order (Firestore documents are limited to 1 MB).
      // The photo is looked up from the meal when the order is shown.
      productImageUrl: item.product.imageUrl?.startsWith('data:') ? '' : item.product.imageUrl,
      quantity: item.quantity,
      unitPrice: item.product.price,
      subtotal: item.product.price * item.quantity,
      nutrition: {
        calories: item.product.nutrition.calories * item.quantity,
        protein: item.product.nutrition.protein * item.quantity,
        carbs: item.product.nutrition.carbs * item.quantity,
        fat: item.product.nutrition.fat * item.quantity,
      },
    }));

    const subtotal = this.cartService.subtotal();
    const deliveryFee = params.fulfillmentType === 'delivery' ? 49 : 0; // [CHECKOUT-FIX #3] same as the checkout screen
    const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;

    const order: Order = {
      id: 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      orderNumber: this.generateOrderNumber(),
      customerId: user.id,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.phone,
      customerAddress: params.deliveryAddress || user.address,
      sellerId: sellerId,
      sellerName: seller ? `${seller.firstName} ${seller.lastName}` : 'Unknown',
      businessId: business?.id || '',
      businessName: business?.businessName || this.cartService.currentBusinessName() || 'Unknown',
      items: orderItems,
      subtotal,
      deliveryFee,
      serviceFee,
      total: subtotal + deliveryFee + serviceFee,
      fulfillmentType: params.fulfillmentType,
      paymentMethod: params.paymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
      specialInstructions: params.specialInstructions,
      statusHistory: [
        { status: 'pending' as OrderStatus, timestamp: new Date(), note: 'Order placed' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save the order and take the stock, together (all or nothing)
    const saved = await this.cloud.placeOrder(order);
    if (!saved.success) return { success: false, message: saved.message };

    this.mockData.addOrder(order);

    // Tell the seller (saved to Firestore, so it shows on the seller's own screen)
    this.mockData.addNotification({
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      userId: sellerId,
      type: 'order',
      title: 'New Order Received',
      message: `Order ${order.orderNumber} from ${order.customerName}`,
      isRead: false,
      link: '/seller/orders',
      createdAt: new Date(),
    });

    this.cartService.clearCart();
    return { success: true, message: 'Order placed successfully!', order };
  }

  /**
   * Seller moves an order forward. The screen updates at once; the change is then saved to
   * Firestore. If Firestore refuses it (for example offline), the screen goes back.
   * Only the customer (or an admin) can cancel an order.
   */
  /** Only finished orders can be archived. */
  canArchive(order: Order): boolean {
    return ['completed', 'delivered', 'cancelled'].includes(order.status);
  }

  /** Hide / show a finished order in the seller's or admin's own lists. The customer is not affected. */
  async setArchived(
    order: Order,
    by: 'seller' | 'admin' | 'customer',
    value: boolean,
  ): Promise<boolean> {
    if (value && !this.canArchive(order)) return false;
    const key =
      by === 'seller'
        ? 'archivedBySeller'
        : by === 'customer'
          ? 'archivedByCustomer'
          : 'archivedByAdmin';
    this.mockData.updateOrder({ ...order, [key]: value });
    this.cloud.notifyChange();
    const ok = await this.cloud.setOrderArchived(order.id, key, value);
    if (!ok) {
      this.mockData.updateOrder(order);
      this.cloud.notifyChange();
    }
    return ok;
  }

  updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    prepMinutes?: number,
  ): { success: boolean; message: string } {
    const order = this.mockData.getOrder(orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    if (newStatus === 'cancelled') {
      const user = this.authService.user();
      if (!user || (user.id !== order.customerId && user.role !== 'admin')) {
        return { success: false, message: 'Only the customer can cancel an order.' };
      }
    }

    return this.applyStatus(order, newStatus, note, prepMinutes);
  }

  cancelOrder(orderId: string, reason?: string): { success: boolean; message: string } {
    const order = this.mockData.getOrder(orderId);
    if (!order) return { success: false, message: 'Order not found.' };

    const user = this.authService.user();
    if (!user || (user.id !== order.customerId && user.role !== 'admin')) {
      return { success: false, message: 'Only the customer can cancel an order.' };
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return { success: false, message: 'This order can no longer be cancelled.' };
    }

    // The stock is given back in Firestore together with the cancellation
    return this.applyStatus(
      order,
      'cancelled',
      reason || 'Order cancelled',
      undefined,
      order.items,
    );
  }

  private applyStatus(
    order: Order,
    newStatus: OrderStatus,
    note?: string,
    prepMinutes?: number,
    restoreStockFor?: OrderItem[],
    silent = false, // automatic changes should not pop up an alert if they fail
  ): { success: boolean; message: string } {
    const allowed = this.validTransitions[order.status];
    if (!allowed.includes(newStatus)) {
      return {
        success: false,
        message: `Cannot change status from "${this.formatStatus(order.status)}" to "${this.formatStatus(newStatus)}".`,
      };
    }

    // Accepting an order with a prep time sets the "ready by" time.
    const estimatedReadyAt =
      newStatus === 'preparing' && prepMinutes
        ? new Date(Date.now() + prepMinutes * 60 * 1000)
        : order.estimatedReadyAt;

    const updated: Order = {
      ...order,
      status: newStatus,
      prepMinutes: newStatus === 'preparing' && prepMinutes ? prepMinutes : order.prepMinutes,
      estimatedReadyAt,
      statusHistory: [...order.statusHistory, { status: newStatus, timestamp: new Date(), note }],
      paymentStatus:
        newStatus === 'completed' || newStatus === 'delivered' ? 'paid' : order.paymentStatus,
      updatedAt: new Date(),
    };

    // 1) show the change right away
    this.mockData.updateOrder(updated);
    this.cloud.notifyChange(); // [LIVE] redraw the open screens now, not only when Firestore answers

    // 2) save it to Firestore (the Security Rules decide if it is allowed)
    const restore = (restoreStockFor || []).map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));
    this.cloud.saveOrderUpdate(updated, restore).then((ok) => {
      if (!ok) {
        this.mockData.updateOrder(order); // put the screen back
        this.cloud.notifyChange();
        if (!silent && typeof window !== 'undefined') {
          window.alert(
            'The change could not be saved. Please check your connection and try again.',
          );
        }
        return;
      }

      // 3) only after it is saved: tell the customer the new status (and the ready-by time)
      const readyBy =
        newStatus === 'preparing' && estimatedReadyAt
          ? ` Ready by ${new Date(estimatedReadyAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}.`
          : '';

      // When the customer cancels, the seller is told. Otherwise the customer is told.
      const user = this.authService.user();
      const cancelledByCustomer = newStatus === 'cancelled' && user?.id === order.customerId;
      this.mockData.addNotification({
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        userId: cancelledByCustomer ? order.sellerId : order.customerId,
        type: 'order',
        title: cancelledByCustomer ? 'Order Cancelled by Customer' : 'Order Status Updated',
        message: cancelledByCustomer
          ? `Order ${order.orderNumber} was cancelled by ${order.customerName}.`
          : `Your order ${order.orderNumber} is now ${this.formatStatus(newStatus)}.${readyBy}`,
        isRead: false,
        link: cancelledByCustomer ? '/seller/orders' : '/customer/orders',
        createdAt: new Date(),
      });
    });

    return { success: true, message: `Order status updated to "${this.formatStatus(newStatus)}".` };
  }

  // ─── Automatic "Ready" when the preparation time is up ────────────────

  private autoReadyTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * While a seller is logged in, check every 15 seconds: any order that is Preparing and whose
   * "ready by" time has passed is moved to Ready (and the customer is notified).
   * It only runs in the seller's open browser. Safe to call many times.
   */
  startAutoReady(): void {
    if (this.autoReadyTimer) return;
    this.autoReadyCheck();
    this.autoReadyTimer = setInterval(() => this.autoReadyCheck(), 15000);
  }

  private autoReadyCheck(): void {
    const user = this.authService.user();
    if (!user || user.role !== 'seller') {
      // logged out (or not a seller): stop checking
      if (this.autoReadyTimer) clearInterval(this.autoReadyTimer);
      this.autoReadyTimer = null;
      return;
    }

    const now = Date.now();
    this.mockData
      .getOrdersBySellerId(user.id)
      .filter(
        (o) =>
          o.status === 'preparing' &&
          !!o.estimatedReadyAt &&
          new Date(o.estimatedReadyAt).getTime() <= now,
      )
      .forEach((o) =>
        this.applyStatus(
          o,
          'ready',
          'Ready automatically: preparation time finished',
          undefined,
          undefined,
          true,
        ),
      );
  }

  getValidTransitions(currentStatus: OrderStatus, fulfillmentType: FulfillmentType): OrderStatus[] {
    const transitions = this.validTransitions[currentStatus] || [];
    if (fulfillmentType === 'pickup') {
      // Pickup orders go ready -> completed (no delivery steps)
      return transitions.filter((s) => s !== 'out_for_delivery' && s !== 'delivered');
    }
    if (fulfillmentType === 'delivery' && currentStatus === 'ready') {
      return transitions.filter((s) => s !== 'completed');
    }
    return transitions;
  }

  formatStatus(status: OrderStatus): string {
    const labels: Record<OrderStatus, string> = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready for Pickup',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  }

  /**
   * Order numbers must be unique across ALL customers. A customer only sees their own orders,
   * so counting orders (the old way) would give every customer the same "001".
   * This uses the clock instead, for example GP-2026-K3F9QZ.
   */
  // Temporary value only: the real running number (GP-0001, GP-0002 ...) is set when the order is saved.
  private generateOrderNumber(): string {
    // [ORDER-NO] easy to read out loud: GP-<date>-<4 characters>, e.g. GP-20261122-7KQ4
    // (no 0/O or 1/I so nobody mixes them up; the order's real id stays unique on its own)
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    return `GP-${date}-${code}`;
  }
}
