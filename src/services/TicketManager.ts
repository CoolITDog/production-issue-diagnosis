import { ProductionTicket, TicketManager as ITicketManager } from '../types';

/**
 * TicketManager handles the creation, validation, and storage of production tickets
 * in browser local storage.
 */
export class TicketManager implements ITicketManager {
  private readonly STORAGE_KEY = 'production_tickets';

  /**
   * Creates a new production ticket with validation
   * @param ticket The ticket data to create
   * @returns The ID of the created ticket
   * @throws Error if ticket validation fails
   */
  createTicket(ticket: ProductionTicket): string {
    // Validate required fields
    this.validateTicket(ticket);

    // Generate ID if not provided
    const ticketWithId = {
      ...ticket,
      id: ticket.id || this.generateTicketId(),
      timestamp: ticket.timestamp || new Date(),
    };

    // Store the ticket
    const tickets = this.getCurrentTickets();
    tickets.push(ticketWithId);
    this.saveTickets(tickets);

    return ticketWithId.id;
  }

  /**
   * Updates an existing ticket
   * @param ticketId The ID of the ticket to update
   * @param updates Partial ticket data to update
   */
  updateTicket(ticketId: string, updates: Partial<ProductionTicket>): void {
    const tickets = this.getCurrentTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticketId);
    
    if (ticketIndex === -1) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Merge updates with existing ticket
    const updatedTicket = { ...tickets[ticketIndex], ...updates };
    
    // Validate the updated ticket
    this.validateTicket(updatedTicket);
    
    tickets[ticketIndex] = updatedTicket;
    this.saveTickets(tickets);
  }

  /**
   * Retrieves a ticket by ID
   * @param ticketId The ID of the ticket to retrieve
   * @returns The ticket or null if not found
   */
  getTicket(ticketId: string): ProductionTicket | null {
    const tickets = this.getCurrentTickets();
    return tickets.find(t => t.id === ticketId) || null;
  }

  /**
   * Gets all current tickets from storage
   * @returns Array of all tickets
   */
  getCurrentTickets(): ProductionTicket[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const tickets = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return tickets.map((ticket: any) => ({
        ...ticket,
        timestamp: new Date(ticket.timestamp),
      }));
    } catch (error) {
      console.error('Error loading tickets from storage:', error);
      return [];
    }
  }

  /**
   * Clears all tickets from storage
   */
  clearTickets(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Validates a production ticket for completeness and correctness
   * @param ticket The ticket to validate
   * @throws Error if validation fails
   */
  private validateTicket(ticket: ProductionTicket): void {
    const errors: string[] = [];

    // Required fields validation
    if (!ticket.title || ticket.title.trim() === '') {
      errors.push('Title is required');
    }

    if (!ticket.description || ticket.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!ticket.severity || !['low', 'medium', 'high', 'critical'].includes(ticket.severity)) {
      errors.push('Valid severity level is required (low, medium, high, critical)');
    }

    if (!ticket.status || !['draft', 'analyzing', 'completed'].includes(ticket.status)) {
      errors.push('Valid status is required (draft, analyzing, completed)');
    }

    // Input/Output data validation - allow empty strings, arrays, objects, and null
    // Don't require specific format, just ensure they're not undefined
    if (ticket.inputData === undefined) {
      errors.push('Input data is required (can be empty string, object, or null)');
    }

    if (ticket.outputData === undefined) {
      errors.push('Output data is required (can be empty string, object, or null)');
    }

    // Timestamp validation
    if (ticket.timestamp && !(ticket.timestamp instanceof Date)) {
      errors.push('Timestamp must be a valid Date object');
    }

    if (errors.length > 0) {
      throw new Error(`Ticket validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Generates a unique ticket ID
   * @returns A unique ticket ID
   */
  private generateTicketId(): string {
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Saves tickets to local storage
   * @param tickets Array of tickets to save
   */
  private saveTickets(tickets: ProductionTicket[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tickets));
    } catch (error) {
      throw new Error(`Failed to save tickets to storage: ${error}`);
    }
  }
}