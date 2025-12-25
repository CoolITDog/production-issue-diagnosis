import {
  ProcessedDiagnosisResult,
  FormattedDiagnosisResult,
  DiagnosisDisplayData,
  FormattedCause,
  FormattedSolution,
  ChartData,
  MetricData,
  AlertData,
  CodeHighlight,
} from './DiagnosisResultProcessor';

export interface DisplayOptions {
  showConfidenceIndicators: boolean;
  showCodeSnippets: boolean;
  showDetailedSteps: boolean;
  showRecommendations: boolean;
  maxCausesToShow: number;
  maxSolutionsToShow: number;
  theme: 'light' | 'dark';
  compactMode: boolean;
}

export interface DisplayComponent {
  type: 'summary' | 'causes' | 'solutions' | 'code' | 'metrics' | 'charts' | 'timeline' | 'recommendations';
  title: string;
  content: any;
  priority: number;
  visible: boolean;
}

export interface DisplayLayout {
  components: DisplayComponent[];
  sidebar: SidebarComponent[];
  actions: ActionButton[];
  navigation: NavigationItem[];
}

export interface SidebarComponent {
  type: 'metrics' | 'alerts' | 'progress' | 'actions';
  title: string;
  content: any;
  collapsible: boolean;
  collapsed: boolean;
}

export interface ActionButton {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger' | 'success';
  action: string;
  icon?: string;
  disabled: boolean;
  tooltip?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  active: boolean;
  badge?: string | number;
}

export interface RenderOptions {
  format: 'html' | 'react' | 'vue' | 'json';
  includeStyles: boolean;
  includeScripts: boolean;
  responsive: boolean;
}

/**
 * Service for displaying and rendering diagnosis results in various UI formats
 */
export class DiagnosisDisplayService {
  private defaultOptions: DisplayOptions = {
    showConfidenceIndicators: true,
    showCodeSnippets: true,
    showDetailedSteps: true,
    showRecommendations: true,
    maxCausesToShow: 5,
    maxSolutionsToShow: 10,
    theme: 'light',
    compactMode: false,
  };

  /**
   * Create display layout from processed diagnosis result
   */
  createDisplayLayout(
    processedResult: ProcessedDiagnosisResult,
    options: Partial<DisplayOptions> = {}
  ): DisplayLayout {
    const displayOptions = { ...this.defaultOptions, ...options };
    const { formattedResult, displayData } = processedResult;

    const components = this.createDisplayComponents(formattedResult, displayData, displayOptions);
    const sidebar = this.createSidebarComponents(formattedResult, displayData, displayOptions);
    const actions = this.createActionButtons(formattedResult, displayOptions);
    const navigation = this.createNavigationItems(formattedResult);

    return {
      components,
      sidebar,
      actions,
      navigation,
    };
  }

  /**
   * Render diagnosis result as HTML
   */
  renderAsHTML(
    processedResult: ProcessedDiagnosisResult,
    options: Partial<DisplayOptions & RenderOptions> = {}
  ): string {
    const displayOptions = { ...this.defaultOptions, ...options };
    const layout = this.createDisplayLayout(processedResult, displayOptions);

    let html = this.generateHTMLHeader(displayOptions);
    html += this.generateHTMLBody(layout, processedResult, displayOptions);
    html += this.generateHTMLFooter(displayOptions);

    return html;
  }

  /**
   * Render diagnosis result as React components structure
   */
  renderAsReactStructure(
    processedResult: ProcessedDiagnosisResult,
    options: Partial<DisplayOptions> = {}
  ): any {
    const displayOptions = { ...this.defaultOptions, ...options };
    const layout = this.createDisplayLayout(processedResult, displayOptions);

    return {
      type: 'DiagnosisDisplay',
      props: {
        layout,
        processedResult,
        options: displayOptions,
      },
      children: layout.components.map(component => this.componentToReactStructure(component)),
    };
  }

  /**
   * Generate summary card for quick overview
   */
  generateSummaryCard(formattedResult: FormattedDiagnosisResult): any {
    return {
      type: 'summary-card',
      data: {
        title: formattedResult.summary.title,
        confidence: formattedResult.summary.confidence,
        confidenceLevel: formattedResult.summary.confidenceLevel,
        primaryCause: formattedResult.summary.primaryCause,
        urgency: formattedResult.summary.urgency,
        estimatedTime: formattedResult.summary.estimatedResolutionTime,
        causesCount: formattedResult.causes.length,
        solutionsCount: formattedResult.solutions.length,
      },
      styling: {
        urgencyColor: this.getUrgencyColor(formattedResult.summary.urgency),
        confidenceColor: this.getConfidenceColor(formattedResult.summary.confidenceLevel),
      },
    };
  }

  /**
   * Generate causes display with visual indicators
   */
  generateCausesDisplay(
    causes: FormattedCause[],
    options: DisplayOptions
  ): any {
    const displayCauses = causes.slice(0, options.maxCausesToShow);

    return {
      type: 'causes-display',
      data: {
        causes: displayCauses.map(cause => ({
          ...cause,
          probabilityBar: {
            width: `${cause.probability * 100}%`,
            color: this.getProbabilityColor(cause.probability),
          },
          categoryIcon: this.getCategoryIcon(cause.category),
          impactBadge: {
            text: cause.impact,
            color: this.getImpactColor(cause.impact),
          },
        })),
        showMore: causes.length > options.maxCausesToShow,
        hiddenCount: Math.max(0, causes.length - options.maxCausesToShow),
      },
    };
  }

  /**
   * Generate solutions display with action steps
   */
  generateSolutionsDisplay(
    solutions: FormattedSolution[],
    options: DisplayOptions
  ): any {
    const displaySolutions = solutions.slice(0, options.maxSolutionsToShow);

    return {
      type: 'solutions-display',
      data: {
        solutions: displaySolutions.map(solution => ({
          ...solution,
          priorityBadge: {
            text: solution.priority,
            color: this.getPriorityColor(solution.priority),
          },
          complexityIndicator: {
            level: solution.complexity,
            color: this.getComplexityColor(solution.complexity),
          },
          riskIndicator: {
            level: solution.riskLevel,
            color: this.getRiskColor(solution.riskLevel),
          },
          expandedSteps: options.showDetailedSteps ? solution.steps : solution.steps.slice(0, 3),
          hasMoreSteps: !options.showDetailedSteps && solution.steps.length > 3,
        })),
        showMore: solutions.length > options.maxSolutionsToShow,
        hiddenCount: Math.max(0, solutions.length - options.maxSolutionsToShow),
      },
    };
  }

  /**
   * Generate code highlights display
   */
  generateCodeHighlightsDisplay(
    highlights: CodeHighlight[],
    options: DisplayOptions
  ): any {
    if (!options.showCodeSnippets) {
      return null;
    }

    return {
      type: 'code-highlights',
      data: {
        highlights: highlights.map(highlight => ({
          ...highlight,
          severityColor: this.getSeverityColor(highlight.severity),
          typeIcon: this.getHighlightTypeIcon(highlight.type),
          lineNumbers: this.generateLineNumbers(highlight.startLine, highlight.endLine),
        })),
        groupedByFile: this.groupHighlightsByFile(highlights),
      },
    };
  }

  /**
   * Generate metrics dashboard
   */
  generateMetricsDashboard(metrics: MetricData[]): any {
    return {
      type: 'metrics-dashboard',
      data: {
        metrics: metrics.map(metric => ({
          ...metric,
          statusColor: this.getStatusColor(metric.status),
          statusIcon: this.getStatusIcon(metric.status),
          trendIcon: metric.trend ? this.getTrendIcon(metric.trend) : null,
        })),
        layout: this.calculateMetricsLayout(metrics),
      },
    };
  }

  /**
   * Generate charts for visualization
   */
  generateChartsDisplay(charts: ChartData[]): any {
    return {
      type: 'charts-display',
      data: {
        charts: charts.map(chart => ({
          ...chart,
          config: this.generateChartConfig(chart),
          responsive: true,
        })),
        layout: this.calculateChartsLayout(charts),
      },
    };
  }

  /**
   * Generate alerts display
   */
  generateAlertsDisplay(alerts: AlertData[]): any {
    return {
      type: 'alerts-display',
      data: {
        alerts: alerts.map(alert => ({
          ...alert,
          typeColor: this.getAlertTypeColor(alert.type),
          typeIcon: this.getAlertTypeIcon(alert.type),
        })),
        criticalAlerts: alerts.filter(a => a.type === 'error').length,
        warningAlerts: alerts.filter(a => a.type === 'warning').length,
      },
    };
  }

  /**
   * Export display data in various formats
   */
  exportDisplayData(
    processedResult: ProcessedDiagnosisResult,
    format: 'pdf' | 'png' | 'svg' | 'json',
    options: Partial<DisplayOptions> = {}
  ): Promise<Blob | string> {
    const displayOptions = { ...this.defaultOptions, ...options };
    
    switch (format) {
      case 'json':
        return Promise.resolve(JSON.stringify(processedResult, null, 2));
      case 'pdf':
        return this.generatePDFExport(processedResult, displayOptions);
      case 'png':
        return this.generateImageExport(processedResult, displayOptions, 'png');
      case 'svg':
        return this.generateImageExport(processedResult, displayOptions, 'svg');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private createDisplayComponents(
    formattedResult: FormattedDiagnosisResult,
    displayData: DiagnosisDisplayData,
    options: DisplayOptions
  ): DisplayComponent[] {
    const components: DisplayComponent[] = [];

    // Summary component (always first)
    components.push({
      type: 'summary',
      title: 'Diagnosis Summary',
      content: this.generateSummaryCard(formattedResult),
      priority: 1,
      visible: true,
    });

    // Causes component
    components.push({
      type: 'causes',
      title: 'Possible Causes',
      content: this.generateCausesDisplay(formattedResult.causes, options),
      priority: 2,
      visible: formattedResult.causes.length > 0,
    });

    // Solutions component
    components.push({
      type: 'solutions',
      title: 'Recommended Solutions',
      content: this.generateSolutionsDisplay(formattedResult.solutions, options),
      priority: 3,
      visible: formattedResult.solutions.length > 0,
    });

    // Code highlights component
    if (options.showCodeSnippets && displayData.codeHighlights.length > 0) {
      components.push({
        type: 'code',
        title: 'Code Analysis',
        content: this.generateCodeHighlightsDisplay(displayData.codeHighlights, options),
        priority: 4,
        visible: true,
      });
    }

    // Charts component
    if (displayData.charts.length > 0) {
      components.push({
        type: 'charts',
        title: 'Analysis Charts',
        content: this.generateChartsDisplay(displayData.charts),
        priority: 5,
        visible: true,
      });
    }

    // Recommendations component
    if (options.showRecommendations && formattedResult.recommendations.length > 0) {
      components.push({
        type: 'recommendations',
        title: 'Recommendations',
        content: formattedResult.recommendations,
        priority: 6,
        visible: true,
      });
    }

    return components.sort((a, b) => a.priority - b.priority);
  }

  private createSidebarComponents(
    formattedResult: FormattedDiagnosisResult,
    displayData: DiagnosisDisplayData,
    options: DisplayOptions
  ): SidebarComponent[] {
    const sidebar: SidebarComponent[] = [];

    // Metrics component
    sidebar.push({
      type: 'metrics',
      title: 'Key Metrics',
      content: this.generateMetricsDashboard(displayData.metrics),
      collapsible: true,
      collapsed: options.compactMode,
    });

    // Alerts component
    if (displayData.alerts.length > 0) {
      sidebar.push({
        type: 'alerts',
        title: 'Alerts',
        content: this.generateAlertsDisplay(displayData.alerts),
        collapsible: true,
        collapsed: false,
      });
    }

    return sidebar;
  }

  private createActionButtons(
    formattedResult: FormattedDiagnosisResult,
    options: DisplayOptions
  ): ActionButton[] {
    const actions: ActionButton[] = [];

    // Export actions
    actions.push({
      id: 'export-pdf',
      label: 'Export PDF',
      type: 'secondary',
      action: 'export',
      icon: 'download',
      disabled: false,
      tooltip: 'Export diagnosis as PDF report',
    });

    actions.push({
      id: 'export-json',
      label: 'Export JSON',
      type: 'secondary',
      action: 'export',
      icon: 'code',
      disabled: false,
      tooltip: 'Export raw diagnosis data as JSON',
    });

    // Share action
    actions.push({
      id: 'share',
      label: 'Share',
      type: 'primary',
      action: 'share',
      icon: 'share',
      disabled: false,
      tooltip: 'Share diagnosis with team members',
    });

    // Rerun analysis action
    actions.push({
      id: 'rerun',
      label: 'Rerun Analysis',
      type: 'secondary',
      action: 'rerun',
      icon: 'refresh',
      disabled: false,
      tooltip: 'Run diagnosis again with updated parameters',
    });

    return actions;
  }

  private createNavigationItems(formattedResult: FormattedDiagnosisResult): NavigationItem[] {
    const navigation: NavigationItem[] = [];

    navigation.push({
      id: 'summary',
      label: 'Summary',
      href: '#summary',
      active: true,
    });

    if (formattedResult.causes.length > 0) {
      navigation.push({
        id: 'causes',
        label: 'Causes',
        href: '#causes',
        active: false,
        badge: formattedResult.causes.length,
      });
    }

    if (formattedResult.solutions.length > 0) {
      navigation.push({
        id: 'solutions',
        label: 'Solutions',
        href: '#solutions',
        active: false,
        badge: formattedResult.solutions.length,
      });
    }

    navigation.push({
      id: 'recommendations',
      label: 'Recommendations',
      href: '#recommendations',
      active: false,
    });

    return navigation;
  }

  private generateHTMLHeader(options: DisplayOptions): string {
    const theme = options.theme === 'dark' ? 'dark' : 'light';
    
    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagnosis Report</title>
    <style>
        ${this.generateCSS(options)}
    </style>
</head>
<body>`;
  }

  private generateHTMLBody(
    layout: DisplayLayout,
    processedResult: ProcessedDiagnosisResult,
    options: DisplayOptions
  ): string {
    let html = '<div class="diagnosis-container">';
    
    // Header
    html += '<header class="diagnosis-header">';
    html += `<h1>Diagnosis Report</h1>`;
    html += `<div class="diagnosis-meta">`;
    html += `<span>Session: ${processedResult.session.id}</span>`;
    html += `<span>Generated: ${new Date().toLocaleString()}</span>`;
    html += `</div>`;
    html += '</header>';

    // Main content
    html += '<main class="diagnosis-main">';
    html += '<div class="diagnosis-content">';
    
    layout.components.forEach(component => {
      if (component.visible) {
        html += this.componentToHTML(component, options);
      }
    });
    
    html += '</div>';

    // Sidebar
    html += '<aside class="diagnosis-sidebar">';
    layout.sidebar.forEach(sidebarComponent => {
      html += this.sidebarComponentToHTML(sidebarComponent, options);
    });
    html += '</aside>';

    html += '</main>';
    html += '</div>';

    return html;
  }

  private generateHTMLFooter(options: DisplayOptions): string {
    return `
    <script>
        ${this.generateJavaScript(options)}
    </script>
</body>
</html>`;
  }

  private generateCSS(options: DisplayOptions): string {
    const theme = options.theme;
    
    return `
        :root {
            --primary-color: ${theme === 'dark' ? '#4a9eff' : '#007bff'};
            --background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'};
            --text-color: ${theme === 'dark' ? '#ffffff' : '#333333'};
            --border-color: ${theme === 'dark' ? '#333333' : '#e0e0e0'};
            --success-color: #28a745;
            --warning-color: #ffc107;
            --danger-color: #dc3545;
            --info-color: #17a2b8;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }

        .diagnosis-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .diagnosis-header {
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .diagnosis-header h1 {
            margin: 0;
            color: var(--primary-color);
        }

        .diagnosis-meta {
            margin-top: 10px;
            font-size: 0.9em;
            color: #666;
        }

        .diagnosis-meta span {
            margin-right: 20px;
        }

        .diagnosis-main {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 30px;
        }

        .diagnosis-content {
            min-width: 0;
        }

        .diagnosis-sidebar {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            height: fit-content;
            position: sticky;
            top: 20px;
        }

        .component {
            background: var(--background-color);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .component h2 {
            margin-top: 0;
            color: var(--primary-color);
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
        }

        .confidence-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }

        .confidence-high { background-color: var(--success-color); color: white; }
        .confidence-medium { background-color: var(--warning-color); color: black; }
        .confidence-low { background-color: var(--danger-color); color: white; }

        .urgency-indicator {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
        }

        .urgency-critical { background-color: var(--danger-color); color: white; }
        .urgency-high { background-color: #ff6b35; color: white; }
        .urgency-medium { background-color: var(--warning-color); color: black; }
        .urgency-low { background-color: var(--info-color); color: white; }

        .probability-bar {
            width: 100%;
            height: 8px;
            background-color: var(--border-color);
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
        }

        .probability-fill {
            height: 100%;
            transition: width 0.3s ease;
        }

        .solution-steps {
            margin-top: 15px;
        }

        .solution-step {
            padding: 10px;
            margin: 5px 0;
            background-color: #f8f9fa;
            border-left: 4px solid var(--primary-color);
            border-radius: 4px;
        }

        @media (max-width: 768px) {
            .diagnosis-main {
                grid-template-columns: 1fr;
            }
            
            .diagnosis-sidebar {
                order: -1;
                position: static;
            }
        }
    `;
  }

  private generateJavaScript(options: DisplayOptions): string {
    return `
        // Interactive functionality for the diagnosis display
        document.addEventListener('DOMContentLoaded', function() {
            // Add click handlers for expandable sections
            const expandableElements = document.querySelectorAll('[data-expandable]');
            expandableElements.forEach(element => {
                element.addEventListener('click', function() {
                    const target = document.querySelector(this.dataset.target);
                    if (target) {
                        target.classList.toggle('expanded');
                    }
                });
            });

            // Add smooth scrolling for navigation
            const navLinks = document.querySelectorAll('a[href^="#"]');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                });
            });
        });
    `;
  }

  private componentToHTML(component: DisplayComponent, options: DisplayOptions): string {
    let html = `<div class="component" id="${component.type}">`;
    html += `<h2>${component.title}</h2>`;
    
    switch (component.type) {
      case 'summary':
        html += this.summaryToHTML(component.content, options);
        break;
      case 'causes':
        html += this.causesToHTML(component.content, options);
        break;
      case 'solutions':
        html += this.solutionsToHTML(component.content, options);
        break;
      default:
        html += '<p>Component rendering not implemented</p>';
    }
    
    html += '</div>';
    return html;
  }

  private summaryToHTML(content: any, options: DisplayOptions): string {
    const data = content.data;
    let html = '<div class="summary-card">';
    
    html += `<div class="summary-row">`;
    html += `<span class="summary-label">Confidence:</span>`;
    html += `<span class="confidence-indicator confidence-${data.confidenceLevel}">`;
    html += `${Math.round(data.confidence * 100)}% (${data.confidenceLevel})`;
    html += `</span>`;
    html += `</div>`;
    
    html += `<div class="summary-row">`;
    html += `<span class="summary-label">Urgency:</span>`;
    html += `<span class="urgency-indicator urgency-${data.urgency}">${data.urgency}</span>`;
    html += `</div>`;
    
    html += `<div class="summary-row">`;
    html += `<span class="summary-label">Primary Cause:</span>`;
    html += `<span>${data.primaryCause}</span>`;
    html += `</div>`;
    
    html += `<div class="summary-row">`;
    html += `<span class="summary-label">Estimated Resolution:</span>`;
    html += `<span>${data.estimatedTime}</span>`;
    html += `</div>`;
    
    html += '</div>';
    return html;
  }

  private causesToHTML(content: any, options: DisplayOptions): string {
    const data = content.data;
    let html = '<div class="causes-list">';
    
    data.causes.forEach((cause: any, index: number) => {
      html += `<div class="cause-item">`;
      html += `<h4>${index + 1}. ${cause.description}</h4>`;
      html += `<div class="probability-bar">`;
      html += `<div class="probability-fill" style="width: ${cause.probabilityBar.width}; background-color: ${cause.probabilityBar.color}"></div>`;
      html += `</div>`;
      html += `<p>Probability: ${Math.round(cause.probability * 100)}% | Impact: ${cause.impact}</p>`;
      html += `</div>`;
    });
    
    if (data.showMore) {
      html += `<p class="show-more">... and ${data.hiddenCount} more causes</p>`;
    }
    
    html += '</div>';
    return html;
  }

  private solutionsToHTML(content: any, options: DisplayOptions): string {
    const data = content.data;
    let html = '<div class="solutions-list">';
    
    data.solutions.forEach((solution: any, index: number) => {
      html += `<div class="solution-item">`;
      html += `<h4>${index + 1}. ${solution.title}</h4>`;
      html += `<p>${solution.description}</p>`;
      
      html += `<div class="solution-meta">`;
      html += `<span class="priority-badge priority-${solution.priority}">${solution.priority}</span>`;
      html += `<span class="complexity-badge">${solution.complexity}</span>`;
      html += `<span class="time-estimate">${solution.estimatedTime}</span>`;
      html += `</div>`;
      
      if (solution.expandedSteps.length > 0) {
        html += `<div class="solution-steps">`;
        html += `<h5>Steps:</h5>`;
        solution.expandedSteps.forEach((step: any) => {
          html += `<div class="solution-step">`;
          html += `<strong>Step ${step.stepNumber}:</strong> ${step.description}`;
          html += `</div>`;
        });
        html += `</div>`;
      }
      
      html += `</div>`;
    });
    
    html += '</div>';
    return html;
  }

  private sidebarComponentToHTML(component: SidebarComponent, options: DisplayOptions): string {
    let html = `<div class="sidebar-component">`;
    html += `<h3>${component.title}</h3>`;
    html += `<div class="sidebar-content">`;
    // Sidebar content rendering would go here
    html += `</div>`;
    html += `</div>`;
    return html;
  }

  private componentToReactStructure(component: DisplayComponent): any {
    return {
      type: `Diagnosis${component.type.charAt(0).toUpperCase() + component.type.slice(1)}Component`,
      props: {
        title: component.title,
        content: component.content,
        visible: component.visible,
      },
    };
  }

  // Color and styling helper methods
  private getUrgencyColor(urgency: string): string {
    const colors = {
      critical: '#dc3545',
      high: '#ff6b35',
      medium: '#ffc107',
      low: '#17a2b8',
    };
    return colors[urgency as keyof typeof colors] || colors.low;
  }

  private getConfidenceColor(level: string): string {
    const colors = {
      high: '#28a745',
      medium: '#ffc107',
      low: '#dc3545',
    };
    return colors[level as keyof typeof colors] || colors.low;
  }

  private getProbabilityColor(probability: number): string {
    if (probability >= 0.7) return '#dc3545';
    if (probability >= 0.4) return '#ffc107';
    return '#28a745';
  }

  private getCategoryIcon(category: string): string {
    const icons = {
      code: '🔧',
      data: '📊',
      configuration: '⚙️',
      infrastructure: '🏗️',
      external: '🌐',
    };
    return icons[category as keyof typeof icons] || '❓';
  }

  private getImpactColor(impact: string): string {
    const colors = {
      critical: '#dc3545',
      high: '#ff6b35',
      medium: '#ffc107',
      low: '#28a745',
    };
    return colors[impact as keyof typeof colors] || colors.low;
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      high: '#dc3545',
      medium: '#ffc107',
      low: '#28a745',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  }

  private getComplexityColor(complexity: string): string {
    const colors = {
      complex: '#dc3545',
      moderate: '#ffc107',
      simple: '#28a745',
    };
    return colors[complexity as keyof typeof colors] || colors.simple;
  }

  private getRiskColor(risk: string): string {
    const colors = {
      high: '#dc3545',
      medium: '#ffc107',
      low: '#28a745',
    };
    return colors[risk as keyof typeof colors] || colors.low;
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      high: '#dc3545',
      medium: '#ffc107',
      low: '#28a745',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  }

  private getStatusColor(status: string): string {
    const colors = {
      good: '#28a745',
      warning: '#ffc107',
      critical: '#dc3545',
    };
    return colors[status as keyof typeof colors] || colors.warning;
  }

  private getAlertTypeColor(type: string): string {
    const colors = {
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8',
      success: '#28a745',
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  // Icon helper methods
  private getHighlightTypeIcon(type: string): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      suggestion: '💡',
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  private getStatusIcon(status: string): string {
    const icons = {
      good: '✅',
      warning: '⚠️',
      critical: '❌',
    };
    return icons[status as keyof typeof icons] || '⚠️';
  }

  private getTrendIcon(trend: string): string {
    const icons = {
      up: '📈',
      down: '📉',
      stable: '➡️',
    };
    return icons[trend as keyof typeof icons] || '➡️';
  }

  private getAlertTypeIcon(type: string): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
    };
    return icons[type as keyof typeof icons] || 'ℹ️';
  }

  // Layout and utility methods
  private generateLineNumbers(startLine: number, endLine: number): number[] {
    const numbers = [];
    for (let i = startLine; i <= endLine; i++) {
      numbers.push(i);
    }
    return numbers;
  }

  private groupHighlightsByFile(highlights: CodeHighlight[]): Record<string, CodeHighlight[]> {
    return highlights.reduce((groups, highlight) => {
      if (!groups[highlight.fileName]) {
        groups[highlight.fileName] = [];
      }
      groups[highlight.fileName].push(highlight);
      return groups;
    }, {} as Record<string, CodeHighlight[]>);
  }

  private calculateMetricsLayout(metrics: MetricData[]): any {
    return {
      columns: Math.min(metrics.length, 4),
      rows: Math.ceil(metrics.length / 4),
    };
  }

  private calculateChartsLayout(charts: ChartData[]): any {
    return {
      columns: Math.min(charts.length, 2),
      rows: Math.ceil(charts.length / 2),
    };
  }

  private generateChartConfig(chart: ChartData): any {
    return {
      type: chart.type,
      data: {
        labels: chart.labels,
        datasets: [{
          data: chart.data,
          backgroundColor: chart.colors || ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  private async generatePDFExport(
    processedResult: ProcessedDiagnosisResult,
    options: DisplayOptions
  ): Promise<Blob> {
    // PDF generation would require a library like jsPDF or Puppeteer
    // For now, return a placeholder
    const html = this.renderAsHTML(processedResult, options);
    return new Blob([html], { type: 'text/html' });
  }

  private async generateImageExport(
    processedResult: ProcessedDiagnosisResult,
    options: DisplayOptions,
    format: 'png' | 'svg'
  ): Promise<Blob> {
    // Image generation would require canvas or SVG rendering
    // For now, return a placeholder
    const content = format === 'svg' 
      ? '<svg><text>Diagnosis Export</text></svg>'
      : 'PNG export not implemented';
    
    return new Blob([content], { 
      type: format === 'svg' ? 'image/svg+xml' : 'image/png' 
    });
  }
}

/**
 * Factory function to create diagnosis display service
 */
export function createDiagnosisDisplayService(): DiagnosisDisplayService {
  return new DiagnosisDisplayService();
}