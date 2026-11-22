/** Square photo cards for meals, same look as the customer Explore and admin Meals pages. */
export const MEAL_CARD_STYLES = `
  .results-count { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
  .meal-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-6);
  }
  .meal-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .meal-card.is-archived .meal-img-box img { filter: grayscale(0.8); opacity: 0.8; }
  .meal-img-box {
    position: relative;
    height: 200px;
    background: var(--color-bg-secondary);
    overflow: hidden;
  }
  .meal-img-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .meal-img-box::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 38%;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.26), transparent);
    pointer-events: none;
  }
  .category-tag {
    position: absolute; top: 10px; left: 10px; z-index: 1;
    background: rgba(26, 26, 26, 0.75);
    backdrop-filter: blur(4px);
    color: #fff; font-size: 10px; font-weight: 600;
    padding: 3px 8px; border-radius: var(--radius-full);
  }
  .state-pill { position: absolute; top: 10px; right: 10px; z-index: 1; }
  .stock-pill-img {
    position: absolute; bottom: 10px; left: 10px; z-index: 1;
    background: rgba(255, 255, 255, 0.92);
    color: var(--color-text);
    font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: var(--radius-full);
  }
  .stock-pill-img.low { background: rgba(240, 173, 78, 0.95); color: #78350f; }
  .stock-pill-img.out { background: var(--color-danger); color: #fff; }

  .meal-body { display: flex; flex-direction: column; flex: 1; padding: var(--space-4); }
  .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: 4px; }
  .meal-title {
    font-size: var(--font-size-base); font-weight: 600; line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    min-height: calc(var(--font-size-base) * 1.3 * 2);
  }
  .meal-price { font-size: var(--font-size-base); font-weight: 700; color: var(--color-primary); white-space: nowrap; }
  .meal-sub { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: var(--space-2); }
  .meal-desc {
    font-size: var(--font-size-xs); color: var(--color-text-secondary); line-height: 1.5;
    min-height: calc(var(--font-size-xs) * 1.5 * 2);
    margin-bottom: var(--space-3);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .admin-note { font-size: 11px; color: #b42318; margin: 0 0 var(--space-3); }
  .macros-box {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
    background: var(--color-bg-secondary); padding: 8px 4px;
    border-radius: var(--radius-sm); margin-bottom: var(--space-4);
  }
  .macro-cell { text-align: center; }
  .macro-cell.highlight .macro-val { color: var(--color-primary); font-weight: 700; }
  .macro-val { display: block; font-size: var(--font-size-xs); font-weight: 600; }
  .macro-tag { font-size: 9px; color: var(--color-text-secondary); text-transform: uppercase; }
  .card-actions-row {
    display: flex; align-items: center; justify-content: space-between; gap: var(--space-2);
    margin-top: auto; padding-top: var(--space-3); border-top: 1px solid var(--color-border);
  }
  .action-buttons-group { display: flex; align-items: center; gap: var(--space-2); }
`;
