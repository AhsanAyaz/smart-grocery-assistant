import { ChangeDetectionStrategy, Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GroceryItem, SmartSuggestion, GroceryCategory } from '../../models/grocery.type';
import { UNIT_OPTIONS, suggestUnitForItem } from '../../constants/units';
import { Grocery } from '../../services/grocery';
import { AiGroceryAssistant } from '../../services/ai-grocery-assistant';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.css',
  // 🎯 Angular 20 Feature: OnPush change detection for better performance
  changeDetection: ChangeDetectionStrategy.OnPush,
  // 🎯 Angular 20 Feature: Standalone components (no modules needed!)
  imports: [CommonModule, RouterModule, FormsModule],
})
export class Home implements OnDestroy {
  // 🎯 Angular 20 Feature: inject() function instead of constructor injection
  private groceryService = inject(Grocery);
  private aiAssistant = inject(AiGroceryAssistant);

  // 🎯 Angular 20 Feature: Signals for reactive state management
  protected readonly isGeneratingList = signal(false);

  // 🎯 Angular 20 Feature: Using resource-based AI service signals
  protected readonly aiSuggestions = this.aiAssistant.suggestions;
  protected readonly isLoadingAISuggestions = this.aiAssistant.isLoading;
  protected readonly aiError = this.aiAssistant.error;

  protected readonly showSuggestions = signal(false);

  // Manual item entry signals
  protected readonly newItemName = signal('');
  protected readonly newItemQuantity = signal('');
  protected readonly newItemUnit = signal('');
  protected readonly isAddingItem = signal(false);

  // Unit options for dropdowns
  protected readonly unitOptions = UNIT_OPTIONS;

  // 🎯 Angular 20 Feature: Readonly signals from service
  protected readonly currentList = this.groceryService.list;

  onGenerateGroceryList(): void {
    this.isGeneratingList.set(true);

    try {
      // Create a new list if none exists
      if (!this.currentList()) {
        this.groceryService.createNewList('Smart List - ' + new Date().toLocaleDateString());
      }

      // Get AI suggestions for the current list
      this.refreshSuggestions();
    } catch (error) {
      console.error('Failed to generate grocery list:', error);
    } finally {
      this.isGeneratingList.set(false);
    }
  }

  addSuggestionToList(suggestion: SmartSuggestion): void {
    // Ensure there's a current list
    if (!this.currentList()) {
      this.groceryService.createNewList();
    }

    this.groceryService.addItemToCurrentList(suggestion.item);

    // Refresh suggestions based on updated list
    // This will trigger the AI service to generate new suggestions
    this.refreshSuggestions();
  }

  removeItemFromList(itemId: string): void {
    this.groceryService.removeItemFromCurrentList(itemId);
    this.refreshSuggestions();
  }

  addManualItem(): void {
    const name = this.newItemName().trim();
    if (!name) return;

    this.isAddingItem.set(true);

    // Ensure there's a current list
    if (!this.currentList()) {
      this.groceryService.createNewList();
    }

    const suggestedUnit = this.newItemUnit() || suggestUnitForItem(name);

    const newItem: GroceryItem = {
      id: this.generateId(),
      name,
      category: this.categorizeItem(name),
      quantity: this.newItemQuantity() ? parseInt(this.newItemQuantity()) : undefined,
      unit: suggestedUnit || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.groceryService.addItemToCurrentList(newItem);

    // Clear form
    this.newItemName.set('');
    this.newItemQuantity.set('');
    this.newItemUnit.set('');
    this.isAddingItem.set(false);

    // Refresh suggestions
    this.refreshSuggestions();
  }

  refreshSuggestions(): void {
    const currentList = this.currentList();
    if (!currentList) return;

    // 🎯 Angular 20 Feature: Use resource-based AI service for all suggestions
    this.aiAssistant.generateSmartSuggestions(currentList.items);

    // The suggestions will be automatically updated via the aiSuggestions signal
    // which is computed from the httpResource in the AI service
    this.showSuggestions.set(true);
  }

  protected updateSuggestionQuantity(suggestion: SmartSuggestion, event: Event): void {
    const target = event.target as HTMLInputElement;
    const quantity = parseInt(target.value) || 1;
    suggestion.item.quantity = quantity;
  }

  protected updateSuggestionUnit(suggestion: SmartSuggestion, event: Event): void {
    const target = event.target as HTMLSelectElement;
    suggestion.item.unit = target.value || undefined;
  }

  getSuggestionIcon(reason: string): string {
    switch (reason) {
      case 'running_low':
        return '⚠️';
      case 'regular_purchase':
        return '🔄';
      case 'seasonal':
        return '🌟';
      case 'complementary':
        return '🤝';
      default:
        return '💡';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  }

  private categorizeItem(itemName: string): GroceryCategory {
    const name = itemName.toLowerCase();

    if (['apple', 'banana', 'carrot', 'lettuce', 'tomato'].some((p) => name.includes(p))) {
      return GroceryCategory.PRODUCE;
    }
    if (['milk', 'cheese', 'yogurt', 'butter'].some((d) => name.includes(d))) {
      return GroceryCategory.DAIRY;
    }
    if (['chicken', 'beef', 'pork'].some((m) => name.includes(m))) {
      return GroceryCategory.MEAT;
    }
    if (['pasta', 'rice', 'bread', 'flour'].some((p) => name.includes(p))) {
      return GroceryCategory.PANTRY;
    }
    if (['soda', 'juice', 'water', 'beer'].some((b) => name.includes(b))) {
      return GroceryCategory.BEVERAGES;
    }
    if (['chips', 'cookies', 'crackers'].some((s) => name.includes(s))) {
      return GroceryCategory.SNACKS;
    }

    return GroceryCategory.OTHER;
  }

  ngOnDestroy(): void {
    // 🎯 Angular 20 Feature: httpResource() handles cleanup automatically
    this.aiAssistant.clearSuggestions();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
