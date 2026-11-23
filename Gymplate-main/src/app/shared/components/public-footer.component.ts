import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../components/icon.component';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="public-footer">
      <div class="footer-container">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="logo">
              <app-icon name="leaf" [size]="24" color="var(--color-primary)"></app-icon>
              <span class="logo-text">Gym<span class="logo-accent">Plate</span></span>
            </div>
            <p class="brand-desc">
              Nutrition-based food ordering system for fitness-focused individuals. Track macros,
              eat better, and reach your fitness goals.
            </p>
            <div class="demo-badge">
              <app-icon name="info" [size]="14"></app-icon>
              <span>Demo Platform — No real payments collected</span>
            </div>
          </div>

          <div class="footer-links-col">
            <h4>Navigation</h4>
            <a routerLink="/">Home</a>
            <a routerLink="/" fragment="about">About GymPlate</a>
            <a routerLink="/" fragment="faqs">FAQs</a>
            <a routerLink="/auth/register">Sign Up</a>
            <a routerLink="/auth/login">Sign In</a>
          </div>

          <div class="footer-links-col">
            <h4>Portals</h4>
            <a routerLink="/auth/login">Sign In (Customer & Seller)</a>
            <a routerLink="/auth/customer-register">Customer Registration</a>
            <a routerLink="/auth/seller-register">Seller Registration</a>
            <a routerLink="/auth/admin-login">Administrator Access</a>
          </div>
        </div>

        <div class="footer-bottom">
          <p>
            &copy; 2026 GymPlate. Nutrition data is seller-provided and not intended as medical
            advice.
          </p>
          <div class="footer-meta">
            <span>Modern Minimalist UI</span>
            <span>&bull;</span>
            <span>Angular 22 Standalone</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [
    `
      .public-footer {
        background-color: #1a241e;
        color: #d1d5db;
        padding: var(--space-16) 0 var(--space-8);
        border-top: 1px solid #2d3a30;
        margin-top: auto;
      }
      .footer-container {
        max-width: var(--container-max);
        margin: 0 auto;
        padding: 0 var(--space-6);
      }
      .footer-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1.5fr;
        gap: var(--space-10);
        margin-bottom: var(--space-12);
      }
      .logo {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-xl);
        font-weight: 700;
        color: #ffffff;
        margin-bottom: var(--space-4);
      }
      .logo-accent {
        color: #4ade80;
      }
      .brand-desc {
        color: #9ca3af;
        font-size: var(--font-size-sm);
        line-height: 1.6;
        margin-bottom: var(--space-4);
      }
      .demo-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--font-size-xs);
        color: #a7f3d0;
        background: rgba(45, 90, 61, 0.4);
        padding: 4px 10px;
        border-radius: var(--radius-full);
        border: 1px solid rgba(74, 222, 128, 0.2);
      }
      .footer-links-col h4 {
        color: #ffffff;
        font-size: var(--font-size-sm);
        font-weight: 600;
        margin-bottom: var(--space-4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .footer-links-col a {
        display: block;
        color: #9ca3af;
        font-size: var(--font-size-sm);
        margin-bottom: var(--space-3);
        transition: color var(--transition-fast);
        text-decoration: none;
      }
      .footer-links-col a:hover {
        color: #ffffff;
      }
      .demo-info {
        font-size: var(--font-size-xs);
        color: #9ca3af;
        margin-bottom: var(--space-2);
      }
      .demo-info strong {
        color: #d1d5db;
      }
      .demo-pass {
        font-size: var(--font-size-xs);
        color: #6ee7b7;
        margin-top: var(--space-3);
        font-family: monospace;
      }
      .footer-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: var(--space-8);
        border-top: 1px solid #2d3a30;
        font-size: var(--font-size-xs);
        color: #6b7280;
      }
      .footer-meta {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }
      @media (max-width: 1024px) {
        .footer-grid {
          grid-template-columns: 1fr 1fr;
          gap: var(--space-8);
        }
      }
      @media (max-width: 640px) {
        .footer-grid {
          grid-template-columns: 1fr;
        }
        .footer-bottom {
          flex-direction: column;
          gap: var(--space-4);
          text-align: center;
        }
      }
    `,
  ],
})
export class PublicFooterComponent {}
