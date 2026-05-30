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
  { id: 'eq10', name: '變頻螺旋式冰水主機', type: '空調設備', model: 'YVAA0280', manufacturer: '約克', installDate: '2023-05-10', status: 'active', location: '台北商辦大樓B棟 B2機房', buildingCategory: '商辦大樓', publicWorkCode: 'ME-AC-010', origin: '美國', specialItem: '', agent: '欣達冷凍空調', specDetail: '280RT、380V/60Hz、R134a冷媒、變頻螺旋式壓縮機、COP 5.8', notes: '' },
  { id: 'eq11', name: '氣冷式冰水主機', type: '空調設備', model: 'CGAM150', manufacturer: '特靈', installDate: '2023-07-20', status: 'active', location: '信義五星大飯店 屋頂機房', buildingCategory: '五星旅館', publicWorkCode: 'ME-AC-011', origin: '美國', specialItem: '免冷卻水塔', agent: '台灣特靈', specDetail: '150RT、380V/60Hz、R410A冷媒、氣冷式免冷卻水塔、噪音≦75dB', notes: '' },
  { id: 'eq12', name: '往復式冰水主機', type: '空調設備', model: '30HXC200', manufacturer: '開利', installDate: '2021-09-01', status: 'active', location: '二工裝修案-桃園廠辦', buildingCategory: '二工裝修', publicWorkCode: 'ME-AC-012', origin: '美國', specialItem: '', agent: '開利空調台灣', specDetail: '200RT、380V/60Hz、R134a冷媒、往復式壓縮機、含電子膨脹閥', notes: '' },
  { id: 'eq13', name: '冷卻水塔（橫流式）', type: '空調設備', model: 'CT-500RT-CF', manufacturer: '中外', installDate: '2023-05-15', status: 'active', location: '台北商辦大樓B棟 屋頂', buildingCategory: '商辦大樓', publicWorkCode: 'ME-AC-013', origin: '台灣', specialItem: '', agent: '', specDetail: '橫流式、500RT、FRP材質、低噪音型≦65dB、含防飛散裝置', notes: '' },
  { id: 'eq14', name: '冷卻水塔（密閉式）', type: '空調設備', model: 'PMC-300RT', manufacturer: '平岡', installDate: '2022-10-01', status: 'active', location: '南港IDC機房 屋頂', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-AC-014', origin: '日本', specialItem: '密閉循環，水質潔淨', agent: '平岡台灣', specDetail: '密閉式、300RT、不鏽鋼316L水盤、超低噪音≦60dB、防凍設計', notes: '' },
  { id: 'eq15', name: '冷卻水塔（開放式大型）', type: '空調設備', model: 'BAC-1500RT', manufacturer: 'Baltimore Aircoil', installDate: '2022-06-01', status: 'active', location: '南港IDC機房 屋頂東側', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-AC-015', origin: '美國', specialItem: '', agent: 'BAC台灣代理', specDetail: '開放式、1500RT、玻璃纖維填料、雙速馬達、含自動加藥系統', notes: '' },
  { id: 'eq16', name: '緊急發電機 500kW', type: '電力設備', model: 'C500D6', manufacturer: '康明斯', installDate: '2023-08-01', status: 'active', location: '台北商辦大樓B棟 B1機房', buildingCategory: '商辦大樓', publicWorkCode: 'ME-EL-010', origin: '美國', specialItem: '含ATS自動切換', agent: '康明斯台灣', specDetail: '500kW、380V/60Hz、柴油引擎、含ATS自動切換開關、油箱容量2000L', notes: '' },
  { id: 'eq17', name: '緊急發電機 1500kW', type: '電力設備', model: 'C1500D5', manufacturer: '康明斯', installDate: '2023-03-01', status: 'active', location: '信義五星大飯店 B2機房', buildingCategory: '五星旅館', publicWorkCode: 'ME-EL-011', origin: '美國', specialItem: '含ATS及並聯控制盤', agent: '康明斯台灣', specDetail: '1500kW、380V/60Hz、柴油引擎、含ATS及並聯控制盤、油箱容量5000L、72小時連續運轉', notes: '' },
  { id: 'eq18', name: '緊急發電機 2000kW', type: '電力設備', model: 'MTU-2000DS', manufacturer: 'MTU', installDate: '2022-08-15', status: 'active', location: '南港IDC機房 B1電機房', buildingCategory: 'Internet Data Center', publicWorkCode: 'ME-EL-012', origin: '德國', specialItem: 'N+1備援架構', agent: 'MTU台灣', specDetail: '2000kW、11kV/380V、德國MTU引擎、N+1備援架構、含靜音機房設計、油箱容量8000L', notes: '' },
  { id: 'eq19', name: '冰水主機控制系統', type: '弱電系統', model: 'ALC-WebCTRL', manufacturer: 'Automated Logic', installDate: '2023-06-01', status: 'active', location: '台北辦公大樓A棟 中控室', buildingCategory: '辦公大樓', publicWorkCode: 'ME-WE-010', origin: '美國', specialItem: '含能源管理模組', agent: '台灣ALC', specDetail: '冰水主機群控系統、含能源管理模組EMS、支援BACnet/IP通訊協定、24小時監控', notes: '' },
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
  { id: 'pr12', entityType: 'equipment', entityId: 'eq10', entityName: '變頻螺旋式冰水主機', price: 1450000, priceDate: '2022-06-01', supplier: '欣達冷凍空調', projectRef: '台北商辦B棟前期', sourceType: 'quote', notes: '' },
  { id: 'pr13', entityType: 'equipment', entityId: 'eq10', entityName: '變頻螺旋式冰水主機', price: 1580000, priceDate: '2023-04-20', supplier: '欣達冷凍空調', projectRef: '台北商辦大樓B棟', sourceType: 'contract', notes: '含安裝調試' },
  { id: 'pr14', entityType: 'equipment', entityId: 'eq11', entityName: '氣冷式冰水主機', price: 1800000, priceDate: '2022-11-01', supplier: '台灣特靈', projectRef: '信義五星旅館', sourceType: 'quote', notes: '' },
  { id: 'pr15', entityType: 'equipment', entityId: 'eq11', entityName: '氣冷式冰水主機', price: 1950000, priceDate: '2023-06-15', supplier: '台灣特靈', projectRef: '信義五星大飯店', sourceType: 'contract', notes: '含屋頂基座' },
  { id: 'pr16', entityType: 'equipment', entityId: 'eq12', entityName: '往復式冰水主機', price: 980000, priceDate: '2021-07-01', supplier: '開利空調台灣', projectRef: '桃園廠辦前期', sourceType: 'quote', notes: '' },
  { id: 'pr17', entityType: 'equipment', entityId: 'eq12', entityName: '往復式冰水主機', price: 1050000, priceDate: '2021-08-15', supplier: '開利空調台灣', projectRef: '桃園廠辦裝修', sourceType: 'contract', notes: '' },
  { id: 'pr18', entityType: 'equipment', entityId: 'eq13', entityName: '冷卻水塔（橫流式）', price: 420000, priceDate: '2022-12-01', supplier: '中外機械', projectRef: '台北商辦B棟前期', sourceType: 'quote', notes: '' },
  { id: 'pr19', entityType: 'equipment', entityId: 'eq13', entityName: '冷卻水塔（橫流式）', price: 460000, priceDate: '2023-04-25', supplier: '中外機械', projectRef: '台北商辦大樓B棟', sourceType: 'contract', notes: '' },
  { id: 'pr20', entityType: 'equipment', entityId: 'eq14', entityName: '冷卻水塔（密閉式）', price: 1250000, priceDate: '2022-08-01', supplier: '平岡台灣', projectRef: '南港IDC前期規劃', sourceType: 'quote', notes: '' },
  { id: 'pr21', entityType: 'equipment', entityId: 'eq14', entityName: '冷卻水塔（密閉式）', price: 1350000, priceDate: '2022-09-10', supplier: '平岡台灣', projectRef: '南港IDC機房', sourceType: 'contract', notes: '含不鏽鋼水盤升級' },
  { id: 'pr22', entityType: 'equipment', entityId: 'eq15', entityName: '冷卻水塔（開放式大型）', price: 3200000, priceDate: '2022-03-01', supplier: 'BAC台灣代理', projectRef: '南港IDC機房東側', sourceType: 'contract', notes: '含自動加藥系統' },
  { id: 'pr23', entityType: 'equipment', entityId: 'eq16', entityName: '緊急發電機 500kW', price: 1350000, priceDate: '2022-09-01', supplier: '康明斯台灣', projectRef: '台北商辦B棟', sourceType: 'quote', notes: '' },
  { id: 'pr24', entityType: 'equipment', entityId: 'eq16', entityName: '緊急發電機 500kW', price: 1480000, priceDate: '2023-07-15', supplier: '康明斯台灣', projectRef: '台北商辦大樓B棟', sourceType: 'contract', notes: '含ATS' },
  { id: 'pr25', entityType: 'equipment', entityId: 'eq17', entityName: '緊急發電機 1500kW', price: 3800000, priceDate: '2022-10-01', supplier: '康明斯台灣', projectRef: '信義五星旅館前期', sourceType: 'quote', notes: '' },
  { id: 'pr26', entityType: 'equipment', entityId: 'eq17', entityName: '緊急發電機 1500kW', price: 4100000, priceDate: '2023-02-20', supplier: '康明斯台灣', projectRef: '信義五星大飯店', sourceType: 'contract', notes: '含ATS及並聯控制盤' },
  { id: 'pr27', entityType: 'equipment', entityId: 'eq18', entityName: '緊急發電機 2000kW', price: 7500000, priceDate: '2022-04-01', supplier: 'MTU台灣', projectRef: '南港IDC機房前期', sourceType: 'quote', notes: '' },
  { id: 'pr28', entityType: 'equipment', entityId: 'eq18', entityName: '緊急發電機 2000kW', price: 8200000, priceDate: '2022-07-01', supplier: 'MTU台灣', projectRef: '南港IDC機房', sourceType: 'contract', notes: '含靜音機房設計' },
  { id: 'pr29', entityType: 'equipment', entityId: 'eq19', entityName: '冰水主機控制系統', price: 850000, priceDate: '2023-04-01', supplier: '台灣ALC', projectRef: '台北辦公大樓A棟', sourceType: 'contract', notes: '含軟體授權3年' },
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
