import { Injectable, computed } from '@angular/core';
import { Notification } from '../models';
import { MockDataService } from './mock-data.service';
import { AuthService } from './auth.service';
import { CloudStoreService } from './cloud-store.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    private mockData: MockDataService,
    private authService: AuthService,
    private cloud: CloudStoreService
  ) {}

  getNotifications(): Notification[] {
    this.cloud.version(); // [LIVE] screens that call this redraw when Firestore sends new notifications
    const user = this.authService.user();
    if (!user) return [];
    const mine = this.mockData.getNotificationsByUserId(user.id);
    const shared = user.role === 'admin' ? this.mockData.getNotificationsByUserId('admins') : [];
    return [...mine, ...shared]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.isRead).length;
  }

  markAsRead(id: string): void {
    this.mockData.markNotificationRead(id);
  }

  markAllAsRead(): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => {
      if (!n.isRead) this.mockData.markNotificationRead(n.id);
    });
  }

  addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): void {
    this.mockData.addNotification({
      ...notification,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date()
    });
  }
}
