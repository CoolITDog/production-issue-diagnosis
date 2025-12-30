# 单据详情开始诊断按钮修复

## 问题描述
用户报告在进入单据详情后，点击"开始诊断"按钮没有反应。

## 问题分析
通过代码分析发现问题出现在 `TicketsPage.tsx` 中的 `handleStartDiagnosis` 函数：

```typescript
const handleStartDiagnosis = (ticket: ProductionTicket) => {
  // TODO: Navigate to diagnosis page with ticket
  console.log('Starting diagnosis for ticket:', ticket.id);
};
```

**问题**：
1. 函数只是打印了console.log，没有实际的导航逻辑
2. 没有将选中的单据传递给诊断页面
3. 诊断页面无法获取到要诊断的单据信息

## 修复内容

### 1. 添加导航功能 (`TicketsPage.tsx`)

```typescript
// 添加useNavigate hook
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// 修复handleStartDiagnosis函数
const handleStartDiagnosis = (ticket: ProductionTicket) => {
  try {
    // 将选中的单据存储到localStorage，供诊断页面使用
    localStorage.setItem('selectedTicket', JSON.stringify(ticket));
    
    // 导航到诊断页面
    navigate('/diagnosis');
    
    console.log('Starting diagnosis for ticket:', ticket.id);
  } catch (error) {
    console.error('Failed to start diagnosis:', error);
    alert('启动诊断失败，请重试');
  }
};
```

### 2. 修改诊断页面加载逻辑 (`DiagnosisPage.tsx`)

```typescript
// 从localStorage加载当前项目和选中的单据
React.useEffect(() => {
  // 加载当前项目
  const currentProjectData = localStorage.getItem('currentProject');
  if (currentProjectData) {
    try {
      const project = JSON.parse(currentProjectData);
      setSelectedProject(project);
    } catch (error) {
      console.error('Failed to parse current project data:', error);
    }
  }

  // 加载选中的单据
  const selectedTicketData = localStorage.getItem('selectedTicket');
  if (selectedTicketData) {
    try {
      const ticket = JSON.parse(selectedTicketData);
      setSelectedTicket(ticket);
      console.log('Loaded selected ticket:', ticket);
    } catch (error) {
      console.error('Failed to parse selected ticket data:', error);
    }
  }
}, []);
```

### 3. 更新可用单据列表

```typescript
// 创建动态单据列表，包含从localStorage加载的单据
const getAvailableTickets = (): ProductionTicket[] => {
  const tickets: ProductionTicket[] = [];
  
  // 从localStorage加载选中的单据
  const selectedTicketData = localStorage.getItem('selectedTicket');
  if (selectedTicketData) {
    try {
      const ticket = JSON.parse(selectedTicketData);
      tickets.push(ticket);
    } catch (error) {
      console.error('Failed to parse selected ticket:', error);
    }
  }
  
  // 添加模拟单据，避免重复
  mockTickets.forEach(mockTicket => {
    if (!tickets.find(t => t.id === mockTicket.id)) {
      tickets.push(mockTicket);
    }
  });
  
  return tickets;
};
```

### 4. 更新调试面板

添加了对 `selectedTicket` 的调试支持，可以检查单据是否正确传递。

## 数据流程

1. **单据详情页面**: 用户点击"开始诊断"按钮
2. **数据存储**: 将选中的单据存储到 `localStorage.selectedTicket`
3. **页面导航**: 使用 `navigate('/diagnosis')` 跳转到诊断页面
4. **数据加载**: 诊断页面从localStorage加载单据和项目信息
5. **自动选择**: 如果有传递的单据，自动选中该单据
6. **开始诊断**: 用户可以直接开始诊断流程

## 测试步骤

1. **创建单据**:
   - 进入单据管理页面
   - 创建一个新单据
   - 填写必要信息并保存

2. **查看单据详情**:
   - 在单据列表中点击单据
   - 进入单据详情页面
   - 验证单据信息显示正确

3. **开始诊断**:
   - 在单据详情页面点击"开始诊断"按钮
   - 应该跳转到诊断页面
   - 验证选中的单据出现在单据选择列表中
   - 验证单据已自动选中

4. **诊断流程**:
   - 选择一个项目（如果没有自动选中）
   - 点击"开始AI诊断"按钮
   - 验证诊断流程正常启动

## 预期结果

- ✅ "开始诊断"按钮正常工作
- ✅ 正确跳转到诊断页面
- ✅ 单据信息正确传递
- ✅ 诊断页面自动选中传递的单据
- ✅ 用户可以直接开始诊断流程
- ✅ 错误处理和用户反馈

## 技术细节

- 使用localStorage进行页面间数据传递
- 使用React Router的useNavigate进行页面导航
- 添加了错误处理和用户友好的错误提示
- 更新了调试工具以支持单据数据检查
- 保持了与现有模拟数据的兼容性