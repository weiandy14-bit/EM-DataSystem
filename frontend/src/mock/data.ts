import type { Equipment, Material, Specification, PricingRecord, InspectionRecord } from '../types'

export const mockEquipment: Equipment[] = [
  { id: 'eq1', name: '變頻離心式冰水主機', type: '空調設備', model: 'YLAA0470', manufacturer: '約克', installDate: '2023-03-15', status: 'active', location: '台北辦公大樓A棟 B2機房', buildingCategory: '辦公大樓', publicWorkCode: 'ME-AC-001', origin: '美國', specialItem: '', agent: '欣達冷凍空調', specDetail: '1000RT，380V/60Hz，R513A冷媒', notes: '' },
  { id: 'eq2', name: '冷卻水塔', type: '空調設備', model: 'FRP-1000RT', manufacturer: '馬可尼', installDate: '2023-03-20', status: 'active', location: '台北辦公大樓A棟 屋頂', buildingCategory: '辦公大樓', publicWorkCode: 'ME-AC-002', origin: '台灣', specialItem: '', agent: '', specDetail: 'FRP玻璃纖維材質，處理水量1000RT', notes: '' },
  { id: 'eq3', name: '高壓氣體絕緣開關(GIS)', type: '電力設備', model: 'ZX2-17.5', manufacturer: 'ABB', installDate: '2023-01-10', status: 'active', location: '台北辦公大樓A棟 電機房', buildingCategory: '辦公大樓', publicWorkCode: 'ME-EL-001', origin: '瑞士', specialItem: 'SF6氣體絕緣', agent: '台灣ABB', specDetail: '17.5kV，630A，25kA', notes: '' },
  { id: 'eq4', name: '乾式變壓器', type: '電力設備', model: 'TR-2000KVA', manufacturer: '正昇', installDate: '2023-01-15', status: 'active', location: '台北辦公大樓A棟 電機房', buildingCategory: '商辦大樓', publicWorkCode: 'ME-EL-002', origin: '台灣', specialItem: '', agent: '', specDetail: '2000KVA，22.8kV/0.48kV，H級絕緣', notes: '' },
  { id: 'eq5', name: '緊急發電機', type: '電力設備', model: 'C1000D5', manufacturer: '康明斯', installDate: '2023-02-01', status: 'active', location: '台北辦公大樓A棟 B1', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-EL-003', origin: '美國', specialItem: '含ATS自動切換', agent: '康明斯台灣', specDetail: '1000kW，380V，含ATS', notes: '含ATS' },
  { id: 'eq6', name: '消防幫浦組', type: '消防設備', model: 'HSHD150', manufacturer: '荏原', installDate: '2023-04-01', status: 'active', location: '信義五星大飯店 B2消防室', buildingCategory: '五星旅館', publicWorkCode: 'ME-FP-001', origin: '日本', specialItem: '含柴油備用泵', agent: '荏原台灣', specDetail: '150HP主泵，含柴油備用泵及試水泵', notes: '含柴油備用泵' },
  { id: 'eq7', name: '電梯', type: '電梯/電扶梯', model: 'NEXIEZ-MRL', manufacturer: '三菱', installDate: '2023-06-01', status: 'active', location: '信義五星大飯店', buildingCategory: '五星旅館', publicWorkCode: 'ME-EV-001', origin: '日本', specialItem: '無機房型', agent: '台灣三菱電梯', specDetail: '無機房型，共6台，速度2.5m/s', notes: '無機房型，共6台' },
  { id: 'eq8', name: '門禁系統', type: '弱電系統', model: 'BioEntry', manufacturer: '台灣Suprema', installDate: '2022-08-01', status: 'active', location: '南港IDC機房 各樓層', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-WE-001', origin: '韓國', specialItem: '', agent: '台灣Suprema', specDetail: '生物辨識門禁，含軟體授權及伺服器', notes: '含軟體授權' },
  { id: 'eq9', name: '空氣處理機', type: '空調設備', model: 'AHU-30000CMH', manufacturer: '約克', installDate: '2022-11-01', status: 'decommissioned', location: '二工裝修案-新竹廠辦', buildingCategory: '二工裝修', publicWorkCode: 'ME-AC-009', origin: '美國', specialItem: '', agent: '欣達冷凍空調', specDetail: '30000CMH風量，含加熱/冷卻盤管', notes: '' },
  { id: 'eq10', name: '螺旋式冰水主機', type: '空調設備', model: 'WSXE-300T', manufacturer: '開利', installDate: '2022-07-01', status: 'active', location: '新竹科技廠辦 B1機房', buildingCategory: '廠辦大樓', publicWorkCode: 'ME-AC-010', origin: '美國', specialItem: '', agent: '開利台灣', specDetail: '300RT，380V/60Hz，R134a冷媒，螺旋式壓縮機', notes: '' },
  { id: 'eq11', name: '冷卻水塔（玻璃纖維）', type: '空調設備', model: 'FRP-300RT', manufacturer: '大力', installDate: '2022-07-15', status: 'active', location: '新竹科技廠辦 屋頂', buildingCategory: '廠辦大樓', publicWorkCode: 'ME-AC-011', origin: '台灣', specialItem: '', agent: '', specDetail: 'FRP材質，300RT，含風車馬達，進出水DN250', notes: '' },
  { id: 'eq12', name: '低壓配電盤 MCC', type: '電力設備', model: 'MCC-380V-2500A', manufacturer: '士林電機', installDate: '2022-08-10', status: 'active', location: '新竹科技廠辦 電機房', buildingCategory: '廠辦大樓', publicWorkCode: 'ME-EL-010', origin: '台灣', specialItem: '', agent: '', specDetail: '380V，2500A主隔離開關，含馬達控制中心（MCC）', notes: '' },
  { id: 'eq13', name: '螺旋式空壓機', type: '機械設備', model: 'GA75-10bar', manufacturer: 'Atlas Copco', installDate: '2023-05-01', status: 'active', location: '新竹科技廠辦 空壓室', buildingCategory: '廠辦大樓', publicWorkCode: 'ME-ME-001', origin: '比利時', specialItem: '含乾燥機', agent: '亞特可台灣', specDetail: '75kW，10bar，壓縮空氣量13.2m³/min，含後冷卻器及乾燥機', notes: '含乾燥機' },
  { id: 'eq14', name: '緊急發電機（柴油）', type: '電力設備', model: 'C500D5-DYNA', manufacturer: '康明斯', installDate: '2021-12-01', status: 'active', location: '信義五星大飯店 B1', buildingCategory: '五星旅館', publicWorkCode: 'ME-EL-011', origin: '美國', specialItem: '含ATS', agent: '康明斯台灣', specDetail: '500kW，380V/60Hz，含ATS自動切換，60分鐘油箱容量', notes: '含ATS' },
  { id: 'eq15', name: '污水處理系統', type: '給排水設備', model: 'STP-500CMD', manufacturer: '德霖', installDate: '2022-03-01', status: 'active', location: '信義五星大飯店 B3', buildingCategory: '五星旅館', publicWorkCode: 'ME-PW-001', origin: '台灣', specialItem: '', agent: '', specDetail: '500CMD處理量，MBR薄膜生物反應器，放流水達BOD<5mg/L', notes: '' },
  { id: 'eq16', name: '不斷電系統 UPS', type: '電力設備', model: 'Galaxy-VX-200kVA', manufacturer: '施耐德', installDate: '2023-09-01', status: 'active', location: '南港IDC機房 UPS室', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-EL-012', origin: '法國', specialItem: '含電池櫃', agent: '施耐德台灣', specDetail: '200kVA/180kW，三相輸入/輸出，效率達99%，電池後備15分鐘', notes: '含電池櫃' },
  { id: 'eq17', name: '精密空調（CRAC）', type: '空調設備', model: 'Liebert-PDX-60kW', manufacturer: '維諦技術', installDate: '2023-09-15', status: 'active', location: '南港IDC機房 各列間', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-AC-017', origin: '美國', specialItem: '列間空調', agent: '維諦台灣', specDetail: '60kW，列間型，PUE<1.2設計目標，R410A冷媒', notes: '列間空調' },
  { id: 'eq18', name: '電動捲門（防火型）', type: '機械設備', model: 'FD-4000W×3500H', manufacturer: '優力', installDate: '2023-02-01', status: 'active', location: '南港IDC機房 各出入口', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-ME-002', origin: '台灣', specialItem: '防火60分鐘', agent: '', specDetail: '防火時效60分鐘，尺寸W4000×H3500，含偵煙連動降落', notes: '防火60分鐘' },
  { id: 'eq19', name: '樓宇自動化系統（BAS）', type: '弱電系統', model: 'DELTA-BAS-2023', manufacturer: '台達電子', installDate: '2023-11-01', status: 'active', location: '台北辦公大樓A棟 中央監控室', buildingCategory: '辦公大樓', publicWorkCode: 'ME-WE-002', origin: '台灣', specialItem: '', agent: '', specDetail: 'BACnet/IP協議，1024點以上，含伺服器、操作站及授權，整合冷凍、空調、電力監控', notes: '' },
]

export const mockMaterials: Material[] = [
  { id: 'mt1', name: '冷媒管（銅管）', type: '空調材料', grade: 'JIS H 3300 C1220', unit: 'm', supplier: '大同' },
  { id: 'mt2', name: '高壓電纜 22kV', type: '電力材料', grade: 'CNS 2653 XLPE', unit: 'm', supplier: '大亞電線電纜' },
  { id: 'mt3', name: '消防灑水頭 ESFR', type: '消防材料', grade: 'UL Listed K-25', unit: 'piece', supplier: '台灣印' },
  { id: 'mt4', name: '鍍鋅鋼管 SCH40', type: '給排水材料', grade: 'CNS 4626', unit: 'm', supplier: '中鋼' },
  { id: 'mt5', name: '耐燃電線 PVC 5.5mm²', type: '電力材料', grade: 'CNS 3292', unit: 'm', supplier: '大亞電線電纜' },
]

export const mockSpecifications: Specification[] = [
  {
    id: 'sp1', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機',
    effectiveFrom: '2022-01-01', effectiveTo: '2022-12-31', versionLabel: '2022版',
    specData: { 冷凍噸: '1000RT', 電壓: '380V', 頻率: '60Hz', 冷媒: 'R134a', 性能係數COP: '6.1', 重量: '12,500kg' },
    changeSummary: '初版規格'
  },
  {
    id: 'sp2', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機',
    effectiveFrom: '2023-01-01', effectiveTo: null, versionLabel: '2023版（現行）',
    specData: { 冷凍噸: '1000RT', 電壓: '380V', 頻率: '60Hz', 冷媒: 'R513A', 性能係數COP: '6.5', 重量: '12,200kg' },
    changeSummary: '冷媒由 R134a 更換為 R513A（低GWP），COP提升至6.5'
  },
  {
    id: 'sp3', entityType: 'equipment', entityId: 'eq4', entityName: '乾式變壓器',
    effectiveFrom: '2022-01-01', effectiveTo: '2023-06-30', versionLabel: '2022版',
    specData: { 容量: '2000KVA', 一次側電壓: '22.8kV', 二次側電壓: '0.48kV', 阻抗: '5.75%', 絕緣等級: 'F級' },
    changeSummary: '初版規格'
  },
  {
    id: 'sp4', entityType: 'equipment', entityId: 'eq4', entityName: '乾式變壓器',
    effectiveFrom: '2023-07-01', effectiveTo: null, versionLabel: '2023版（現行）',
    specData: { 容量: '2000KVA', 一次側電壓: '22.8kV', 二次側電壓: '0.48kV', 阻抗: '5.75%', 絕緣等級: 'H級', 溫升: '100K' },
    changeSummary: '絕緣等級提升為H級，增加溫升規格100K'
  },
  {
    id: 'sp5', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV',
    effectiveFrom: '2021-01-01', effectiveTo: '2022-12-31', versionLabel: '2021版',
    specData: { 額定電壓: '22kV', 導體截面積: '240mm²', 絕緣材質: 'XLPE', 外被: 'PVC', 耐溫: '90°C' },
    changeSummary: '初版'
  },
  {
    id: 'sp6', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV',
    effectiveFrom: '2023-01-01', effectiveTo: null, versionLabel: '2023版（現行）',
    specData: { 額定電壓: '22kV', 導體截面積: '240mm²', 絕緣材質: 'XLPE', 外被: 'LSZH', 耐溫: '90°C', 低煙無鹵: '是' },
    changeSummary: '外被由 PVC 改為 LSZH（低煙無鹵），增加低煙無鹵規格要求'
  },
]

export const mockPricing: PricingRecord[] = [
  { id: 'pr1', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機', price: 2950000, priceDate: '2022-03-01', supplier: '欣達冷凍', projectRef: '台北辦公大樓B棟', sourceType: 'contract', notes: '' },
  { id: 'pr2', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機', price: 3200000, priceDate: '2023-02-15', supplier: '欣達冷凍', projectRef: '台北辦公大樓A棟', sourceType: 'contract', notes: '含安裝調試' },
  { id: 'pr3', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機', price: 3500000, priceDate: '2024-01-10', supplier: '開利空調', projectRef: '新竹科技廠辦', sourceType: 'quote', notes: '' },
  { id: 'pr4', entityType: 'equipment', entityId: 'eq4', entityName: '乾式變壓器', price: 680000, priceDate: '2022-12-01', supplier: '正昇電機', projectRef: '台北辦公大樓A棟', sourceType: 'contract', notes: '' },
  { id: 'pr5', entityType: 'equipment', entityId: 'eq4', entityName: '乾式變壓器', price: 720000, priceDate: '2023-11-20', supplier: '正昇電機', projectRef: '新竹科技廠辦', sourceType: 'contract', notes: '' },
  { id: 'pr6', entityType: 'equipment', entityId: 'eq5', entityName: '緊急發電機', price: 2600000, priceDate: '2022-05-01', supplier: '康明斯台灣', projectRef: '台北辦公大樓B棟', sourceType: 'contract', notes: '' },
  { id: 'pr7', entityType: 'equipment', entityId: 'eq5', entityName: '緊急發電機', price: 2800000, priceDate: '2023-01-15', supplier: '康明斯台灣', projectRef: '台北辦公大樓A棟', sourceType: 'contract', notes: '含ATS' },
  { id: 'pr8', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV', price: 4800, priceDate: '2021-06-01', supplier: '大亞電線電纜', projectRef: '台北辦公大樓B棟', sourceType: 'actual', notes: '元/m' },
  { id: 'pr9', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV', price: 5200, priceDate: '2022-08-01', supplier: '大亞電線電纜', projectRef: '台北辦公大樓A棟', sourceType: 'actual', notes: '元/m' },
  { id: 'pr10', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV', price: 5650, priceDate: '2023-09-15', supplier: '大亞電線電纜', projectRef: '新竹科技廠辦', sourceType: 'contract', notes: '元/m' },
  { id: 'pr11', entityType: 'material', entityId: 'mt2', entityName: '高壓電纜 22kV', price: 5900, priceDate: '2024-02-01', supplier: '大亞電線電纜', projectRef: '新竹科技廠辦2期', sourceType: 'quote', notes: '元/m' },
]

export const mockInspections: InspectionRecord[] = [
  {
    id: 'ins1', inspectionDate: '2023-09-15', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機',
    specSnapshot: { 冷凍噸: '1000RT', 電壓: '380V', 冷媒: 'R513A', 性能係數COP: '6.5' },
    priceAtInspection: 3200000, result: 'pass', findings: '運轉正常，COP量測值6.48，符合規格。冷媒充填量正常。', inspector: '王大明'
  },
  {
    id: 'ins2', inspectionDate: '2024-03-20', entityType: 'equipment', entityId: 'eq1', entityName: '變頻離心式冰水主機',
    specSnapshot: { 冷凍噸: '1000RT', 電壓: '380V', 冷媒: 'R513A', 性能係數COP: '6.5' },
    priceAtInspection: 3500000, result: 'conditional', findings: '主機運轉正常，但發現冷卻水側水垢累積，建議安排化學清洗。振動值略高於標準值5%。', inspector: '李小華'
  },
  {
    id: 'ins3', inspectionDate: '2023-12-01', entityType: 'equipment', entityId: 'eq4', entityName: '乾式變壓器',
    specSnapshot: { 容量: '2000KVA', 絕緣等級: 'H級', 溫升: '100K' },
    priceAtInspection: 720000, result: 'pass', findings: '溫升測試正常，絕緣電阻值良好。', inspector: '陳志偉'
  },
]
