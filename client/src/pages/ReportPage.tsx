import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const agentInfo = [
    { name: '症状分析', icon: '🔍', desc: '分析患者症状，给出初步诊断方向', color: 'blue', gradient: 'from-blue-500 to-blue-600', bg: 'from-blue-50 to-blue-100/50' },
    { name: '检验解读', icon: '🔬', desc: '解读实验室检查和影像学发现', color: 'emerald', gradient: 'from-emerald-500 to-emerald-600', bg: 'from-emerald-50 to-emerald-100/50' },
    { name: '风险评估', icon: '⚠️', desc: '全面评估患者健康风险等级', color: 'amber', gradient: 'from-amber-500 to-amber-600', bg: 'from-amber-50 to-amber-100/50' },
    { name: '治疗建议', icon: '💊', desc: '给出治疗建议和后续随访方案', color: 'purple', gradient: 'from-purple-500 to-purple-600', bg: 'from-purple-50 to-purple-100/50' },
    { name: '通用医疗咨询', icon: '🩺', desc: '全科医学综合咨询与健康指导', color: 'cyan', gradient: 'from-cyan-500 to-teal-600', bg: 'from-cyan-50 to-teal-100/50' },
];

const getAgentInfo = (name: string) => agentInfo.find(a => a.name === name) || agentInfo[0];

export default function ReportPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [pdfExporting, setPdfExporting] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/analysis/result/${id}`)
            .then(res => res.json())
            .then(data => { setRecord(data); setLoading(false); })
            .catch(() => { addToast('加载报告失败', 'error'); setLoading(false); });
    }, [id]);

    const toggleExpand = (key: string) => {
        setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const exportPDF = async () => {
        if (!record) return;
        setPdfExporting(true);
        addToast('正在生成PDF报告...', 'info');

        try {
            // 构建纯HTML报告内容
            const buildReportHTML = () => {
                const agents = record.result?.agents?.filter((a: any) => a.hasData !== false) || [];
                const hos = record.result?.hospitalRecommendation;

                let agentsHTML = '';
                agents.forEach((agent: any, ai: number) => {
                    let data: any = {};
                    try { data = JSON.parse(agent.content); } catch {}
                    const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2'];
                    const color = colors[ai] || '#2563eb';
                    const conf = Math.round((agent.confidence || 0.8) * 100);

                    agentsHTML += `<div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;page-break-inside:avoid;">`;
                    agentsHTML += `<div style="background:${color};color:white;padding:12px 16px;font-size:15px;font-weight:bold;">${agent.agent} &nbsp; 置信度：${conf}%</div>`;
                    agentsHTML += `<div style="padding:14px 16px;background:#fafafa;font-size:13px;line-height:1.8;color:#333;">`;

                    if (ai === 0) {
                        if (data.primary_symptoms?.length) {
                            agentsHTML += `<b>主要症状：</b>${data.primary_symptoms.join('、')}<br/><br/>`;
                        }
                        if (data.possible_conditions?.length) {
                            agentsHTML += `<b>可能诊断：</b><br/>`;
                            data.possible_conditions.forEach((c: any) => {
                                agentsHTML += `&nbsp;&nbsp;• <b>${c.name}</b> [${c.probability}概率] - ${c.reason}<br/>`;
                            });
                            agentsHTML += `<br/>`;
                        }
                        if (data.urgency_level) agentsHTML += `<b>紧急程度：</b>${data.urgency_level}<br/>`;
                    } else if (ai === 1) {
                        if (data.abnormal_findings?.length) {
                            agentsHTML += `<b>异常指标：</b><br/>`;
                            data.abnormal_findings.forEach((f: any) => {
                                agentsHTML += `&nbsp;&nbsp;• ${f.item}: ${f.value}（参考：${f.reference}）- ${f.significance}<br/>`;
                            });
                            agentsHTML += `<br/>`;
                        }
                        if (data.key_observations?.length) {
                            agentsHTML += `<b>关键发现：</b><br/>`;
                            data.key_observations.forEach((o: string) => agentsHTML += `&nbsp;&nbsp;• ${o}<br/>`);
                        }
                    } else if (ai === 2) {
                        if (data.risk_level) agentsHTML += `<b>风险等级：</b>${data.risk_level}<br/><br/>`;
                        if (data.risk_factors?.length) {
                            agentsHTML += `<b>风险因素：</b><br/>`;
                            data.risk_factors.forEach((f: any) => {
                                agentsHTML += `&nbsp;&nbsp;• ${f.factor} [${f.severity}风险] - ${f.description}<br/>`;
                            });
                            agentsHTML += `<br/>`;
                        }
                        if (data.complications_risk?.length) {
                            agentsHTML += `<b>并发症风险：</b>${data.complications_risk.join('、')}<br/>`;
                        }
                    } else if (ai === 3) {
                        if (data.treatment_plan?.length) {
                            agentsHTML += `<b>治疗方案：</b><br/>`;
                            data.treatment_plan.forEach((t: any) => {
                                agentsHTML += `&nbsp;&nbsp;• [${t.priority}] <b>${t.step}</b>：${t.detail}<br/>`;
                            });
                            agentsHTML += `<br/>`;
                        }
                        if (data.medication_suggestions?.length) {
                            agentsHTML += `<b>药物建议：</b><br/>`;
                            data.medication_suggestions.forEach((m: any) => {
                                agentsHTML += `&nbsp;&nbsp;• ${m.drug}：${m.note}<br/>`;
                            });
                            agentsHTML += `<br/>`;
                        }
                        if (data.lifestyle_advice?.length) {
                            agentsHTML += `<b>生活建议：</b><br/>`;
                            data.lifestyle_advice.forEach((a: string) => agentsHTML += `&nbsp;&nbsp;• ${a}<br/>`);
                        }
                    } else if (ai === 4) {
                        if (data.overview) {
                            agentsHTML += `<b>📋 问题概述</b><br/>${data.overview}<br/><br/>`;
                        }
                        if (data.detailed_explanation) {
                            agentsHTML += `<b>🔬 详细解释</b><br/>${data.detailed_explanation}<br/><br/>`;
                        }
                        if (data.department_recommendation) {
                            agentsHTML += `<b>🏥 推荐科室：</b>${data.department_recommendation}<br/>`;
                        }
                        if (data.examination_suggestions?.length) {
                            agentsHTML += `<b>建议检查：</b>${data.examination_suggestions.join('、')}<br/><br/>`;
                        }
                        if (data.lifestyle_advice?.length) {
                            agentsHTML += `<b>🌿 生活调理：</b><br/>`;
                            data.lifestyle_advice.forEach((a: string) => agentsHTML += `&nbsp;&nbsp;• ${a}<br/>`);
                            agentsHTML += `<br/>`;
                        }
                        if (data.psychological_support) {
                            agentsHTML += `<b>💝 心理关怀：</b><i>"${data.psychological_support}"</i><br/>`;
                        }
                    }
                    agentsHTML += `</div></div>`;
                });

                let hospitalHTML = '';
                if (hos?.needed) {
                    hospitalHTML += `<div style="margin-bottom:16px;border:1px solid #fecaca;border-radius:12px;overflow:hidden;page-break-inside:avoid;">`;
                    hospitalHTML += `<div style="background:#dc2626;color:white;padding:12px 16px;font-size:15px;font-weight:bold;">🏥 就近医院推荐</div>`;
                    hospitalHTML += `<div style="padding:14px 16px;background:#fef2f2;font-size:13px;line-height:1.8;color:#333;">`;
                    hospitalHTML += `<p>${hos.message}</p>`;
                    hos.hospitals?.forEach((h: any, hi: number) => {
                        hospitalHTML += `<p>&nbsp;&nbsp;${hi + 1}. <b>${h.name}</b> [${h.level}] - ${h.address} &nbsp; ${h.dept} &nbsp; ${h.distance !== '—' ? h.distance : ''}</p>`;
                    });
                    hospitalHTML += `</div></div>`;
                }

                return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Can0nAI分析报告</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif; color:#333; padding:24px; max-width:800px; margin:0 auto; }
  @media print { body { padding:16px; } }
</style></head><body>
  <div style="background:#2563eb;color:white;padding:20px 24px;border-radius:12px;margin-bottom:20px;text-align:center;">
    <h1 style="font-size:22px;margin:0;">Can0nAI 智能医疗分析报告</h1>
  </div>
  <div style="background:#f8fafc;padding:16px;border-radius:10px;margin-bottom:18px;font-size:13px;line-height:2;border:1px solid #e2e8f0;">
    <b>患者：</b>${record.patientName || '未命名'} &nbsp;&nbsp; <b>年龄：</b>${record.age}岁 &nbsp;&nbsp; <b>性别：</b>${record.gender}<br/>
    <b>分析时间：</b>${new Date(record.createdAt).toLocaleString('zh-CN')} &nbsp;&nbsp; <b>综合置信度：</b>${record.result?.totalConfidence || 87}%
  </div>
  <div style="background:#f1f5f9;padding:12px 16px;border-radius:8px;margin-bottom:18px;font-size:13px;color:#64748b;border:1px solid #e2e8f0;">
    <b>原始输入：</b>${(record.inputText || '').replace(/\n/g, '<br/>')}
  </div>
  ${agentsHTML}
  ${hospitalHTML}
  <div style="margin-top:20px;padding:12px;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;text-align:center;font-size:12px;color:#92400e;">
    ⚠ 免责声明：本报告由AI智能体生成，仅供辅助参考，不能替代专业医生的诊断和治疗建议。如有健康问题，请及时就医。
  </div>
</body></html>`;
            };

            const printWindow = window.open('', '_blank', 'width=900,height=700');
            if (!printWindow) {
                addToast('弹窗被拦截，请允许弹窗后重试', 'error');
                setPdfExporting(false);
                return;
            }
            printWindow.document.write(buildReportHTML());
            printWindow.document.close();
            printWindow.focus();
            // 等待渲染完成后自动打印
            setTimeout(() => {
                printWindow.print();
                setPdfExporting(false);
                addToast('PDF报告已导出（在打印对话框中选择"另存为PDF"）', 'success');
            }, 800);
        } catch (err) {
            console.error('PDF导出失败:', err);
            addToast('PDF导出失败，请重试', 'error');
            setPdfExporting(false);
        }
    };

    const renderAgentSection = (agentResult: any) => {
        try {
            const data = JSON.parse(agentResult.content);
            const agentName = agentResult.agent;

            // 症状分析
            if (agentName === '症状分析') {
                return (
                    <div className="space-y-3">
                        {/* 症状标签 */}
                        <div className="flex flex-wrap gap-2">
                            {data.primary_symptoms?.map((s: string, i: number) => (
                                <span key={i} className="px-2.5 py-1 bg-white/70 backdrop-blur text-blue-700 rounded-full text-xs font-medium border border-blue-200">{s}</span>
                            ))}
                        </div>
                        {/* 诊断列表 */}
                        {data.possible_conditions?.map((c: any, i: number) => {
                            const key = `s-cond-${i}`;
                            const expanded = expandedItems[key] || data.possible_conditions.length <= 1;
                            return (
                                <div key={i} className="p-3 bg-white/60 backdrop-blur rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-white/50" onClick={() => toggleExpand(key)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                c.probability === '高' ? 'bg-red-100 text-red-600' :
                                                c.probability === '中' ? 'bg-amber-100 text-amber-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>{c.probability}概率</span>
                                            <span className="font-medium text-sm">{c.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{expanded ? '收起 ▲' : '展开 ▼'}</span>
                                    </div>
                                    {expanded && (
                                        <div className="mt-2 ml-10 p-2 bg-white/80 rounded border border-gray-100">
                                            <p className="text-xs text-gray-500"><span className="font-medium">诊断依据：</span>{c.reason}</p>
                                            {c.probability === '高' && <p className="text-xs text-red-500 mt-1">⚠ 建议尽快完善相关检查确认诊断</p>}
                                            {c.probability === '中' && <p className="text-xs text-amber-500 mt-1">🟡 需结合更多检查结果综合判断</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {data.urgency_level && (
                            <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                                data.urgency_level === '紧急' ? 'bg-red-50 text-red-700 border border-red-200' :
                                data.urgency_level === '需关注' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-green-50 text-green-700 border border-green-200'
                            }`}>🚨 紧急程度：{data.urgency_level}</div>
                        )}
                    </div>
                );
            }

            // 检验解读
            if (agentName === '检验解读') {
                return (
                    <div className="space-y-2">
                        {data.abnormal_findings?.map((f: any, i: number) => {
                            const key = `s-lab-${i}`;
                            const expanded = expandedItems[key];
                            return (
                                <div key={i} className="p-3 bg-white/60 backdrop-blur rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors border border-white/50" onClick={() => toggleExpand(key)}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-sm">{f.item}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">参考：{f.reference}</span>
                                            <span className="text-xs text-gray-300">{expanded ? '▲' : '▼'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${f.value === '未提供' ? 'text-gray-500' : 'text-red-600 bg-red-50'}`}>{f.value}</span>
                                        {f.value !== '未提供' && <span className="text-xs bg-red-100 text-red-500 px-1.5 py-0.5 rounded">↑ 异常</span>}
                                    </div>
                                    {expanded && (
                                        <div className="mt-2 p-2 bg-white/80 rounded border border-gray-100">
                                            <p className="text-xs text-gray-600"><span className="font-medium text-emerald-600">临床意义：</span>{f.significance}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {data.key_observations?.map((o: string, i: number) => (
                            <p key={i} className="text-sm text-gray-600 flex items-start gap-2 p-2"><span className="text-emerald-500">🔍</span> {o}</p>
                        ))}
                    </div>
                );
            }

            // 风险评估
            if (agentName === '风险评估') {
                return (
                    <div className="space-y-3">
                        <div className={`text-center p-4 rounded-xl font-bold text-lg ${
                            data.risk_level?.includes('高') ? 'bg-red-50 text-red-700 border-2 border-red-300' :
                            data.risk_level?.includes('中') ? 'bg-amber-50 text-amber-700 border-2 border-amber-300' :
                            'bg-green-50 text-green-700 border-2 border-green-300'
                        }`}>{data.risk_level?.includes('高') ? '🔴' : data.risk_level?.includes('中') ? '🟡' : '🟢'} 风险等级：{data.risk_level}</div>
                        {data.risk_factors?.map((f: any, i: number) => {
                            const key = `s-risk-${i}`;
                            const expanded = expandedItems[key];
                            return (
                                <div key={i} className="p-3 bg-white/60 backdrop-blur rounded-lg hover:bg-amber-50 cursor-pointer transition-colors border border-white/50" onClick={() => toggleExpand(key)}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                f.severity === '高' ? 'bg-red-100 text-red-600' :
                                                f.severity === '中' ? 'bg-amber-100 text-amber-600' :
                                                'bg-green-100 text-green-600'
                                            }`}>{f.severity}风险</span>
                                            <span className="font-medium text-sm">{f.factor}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
                                    </div>
                                    {expanded && (
                                        <div className="mt-2 ml-14 p-2 bg-white/80 rounded border border-gray-100">
                                            <p className="text-xs text-gray-600">{f.description}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {data.complications_risk?.length > 0 && (
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-xs font-medium text-red-700 mb-1">⚠ 可能的并发症</p>
                                <div className="flex flex-wrap gap-1.5">{data.complications_risk.map((c: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">{c}</span>
                                ))}</div>
                            </div>
                        )}
                    </div>
                );
            }

            // 治疗建议
            if (agentName === '治疗建议') {
                return (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            {data.treatment_plan?.map((t: any, i: number) => {
                                const key = `s-treat-${i}`;
                                const expanded = expandedItems[key];
                                return (
                                    <div key={i} className="p-3 bg-white/60 backdrop-blur rounded-lg hover:bg-purple-50 cursor-pointer transition-colors border border-white/50" onClick={() => toggleExpand(key)}>
                                        <div className="flex items-start gap-3">
                                            <span className={`text-xs px-1.5 py-0.5 rounded mt-0.5 shrink-0 ${
                                                t.priority === '紧急' ? 'bg-red-100 text-red-600 font-bold' :
                                                t.priority === '重要' ? 'bg-amber-100 text-amber-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>{t.priority}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{t.step}</span>
                                                    <span className="text-xs text-gray-300">{expanded ? '▲' : '▼'}</span>
                                                </div>
                                                {expanded && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.detail}</p>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {data.medication_suggestions?.length > 0 && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs font-medium text-blue-700 mb-2">💊 药物建议</p>
                                {data.medication_suggestions.map((m: any, i: number) => (
                                    <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                                        <span className="text-xs text-blue-600 mt-0.5">•</span>
                                        <div><span className="text-sm font-medium text-blue-700">{m.drug}</span><p className="text-xs text-blue-500">{m.note}</p></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {data.lifestyle_advice && (
                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                                <p className="text-xs font-medium text-emerald-700 mb-1">🌿 生活建议</p>
                                {data.lifestyle_advice.map((a: string, i: number) => (
                                    <p key={i} className="text-sm text-emerald-600 flex items-center gap-1.5"><span className="text-xs">✓</span> {a}</p>
                                ))}
                            </div>
                        )}
                        {data.follow_up && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-xs font-medium text-purple-700 mb-1">📅 随访建议</p>
                                {data.follow_up.map((f: string, i: number) => (
                                    <p key={i} className="text-sm text-purple-600 flex items-center gap-1.5"><span className="text-xs">→</span> {f}</p>
                                ))}
                            </div>
                        )}
                    </div>
                );
            }
            // 通用医疗咨询
            if (agentName === '通用医疗咨询') {
                const info = getAgentInfo(agentName);
                const key = 's-general';
                const expanded = expandedItems[key];
                return (
                    <div className="card-gradient-cyan mb-4 rounded-xl overflow-hidden border border-cyan-100 shadow-sm">
                        <div className="bg-gradient-to-r from-cyan-500 to-teal-600 px-5 py-3 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{info.icon}</span>
                                <span className="font-semibold">{agentName}</span>
                                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{Math.round((agentResult.confidence || 0.85) * 100)}%</span>
                            </div>
                            <button onClick={() => toggleExpand(key)} className="text-white/70 hover:text-white transition-colors text-xs">
                                {expanded ? '收起 ▲' : '展开 ▼'}
                            </button>
                        </div>
                        {expanded && (
                            <div className="p-5 space-y-4 bg-white">
                                {/* 问题概述 */}
                                <div>
                                    <h4 className="text-sm font-semibold text-cyan-700 mb-2">📋 问题概述</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed bg-cyan-50 p-3 rounded-lg">{data.overview}</p>
                                </div>
                                {/* 详细解释 */}
                                <div>
                                    <h4 className="text-sm font-semibold text-cyan-700 mb-2">🔬 详细解释</h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">{data.detailed_explanation}</p>
                                </div>
                                {/* 就医建议 */}
                                <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                                    <h4 className="text-sm font-semibold text-teal-700 mb-2">🏥 就医建议</h4>
                                    <p className="text-sm text-teal-700"><span className="font-medium">推荐科室：</span>{data.department_recommendation}</p>
                                    {data.examination_suggestions?.length > 0 && (
                                        <div className="mt-2">
                                            <span className="text-xs font-medium text-teal-600">建议检查：</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {data.examination_suggestions.map((s: string, i: number) => (
                                                    <span key={i} className="text-xs bg-white text-teal-600 px-2 py-0.5 rounded border border-teal-200">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* 生活建议 */}
                                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                    <h4 className="text-sm font-semibold text-emerald-700 mb-2">🌿 生活调理建议</h4>
                                    {data.lifestyle_advice?.map((a: string, i: number) => (
                                        <p key={i} className="text-sm text-emerald-600 flex items-center gap-1.5"><span className="text-xs">✓</span> {a}</p>
                                    ))}
                                </div>
                                {/* 心理关怀 */}
                                <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg border border-rose-100">
                                    <h4 className="text-sm font-semibold text-rose-700 mb-2">💝 心理关怀</h4>
                                    <p className="text-sm text-rose-600 italic leading-relaxed">"{data.psychological_support}"</p>
                                </div>
                                {/* 要点 */}
                                <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                                    <h4 className="text-sm font-semibold text-cyan-700 mb-2">📌 关键要点</h4>
                                    {data.key_points?.map((p: string, i: number) => (
                                        <p key={i} className="text-sm text-cyan-600 flex items-center gap-1.5"><span className="text-xs">✦</span> {p}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }
            return <p className="text-sm text-gray-500">数据解析失败</p>;
        } catch {
            return <p className="text-sm text-gray-500">数据解析失败</p>;
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">加载报告...</p>
                </div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="p-6 lg:p-8 text-center py-16">
                <span className="text-5xl block mb-3">📭</span>
                <p className="text-gray-500">报告数据不存在</p>
                <button onClick={() => navigate('/analysis')} className="mt-4 text-blue-600 hover:underline text-sm">返回分析页</button>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 fade-in">
            {/* 顶部导航 */}
            <div className="flex items-center justify-between mb-6 print-hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors btn-press">
                    ← 返回
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${record.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {record.status === 'completed' ? '已完成' : '失败'}
                    </span>
                    <button onClick={exportPDF} disabled={pdfExporting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all shadow-lg shadow-blue-200 btn-press disabled:opacity-50 disabled:cursor-not-allowed">
                        {pdfExporting ? (
                            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> 生成中...</>
                        ) : (
                            <>📄 导出PDF</>
                        )}
                    </button>
                </div>
            </div>

            {/* 报告头部 */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-200">
                            📊
                        </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-800">综合分析报告</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                            <span className="text-sm text-gray-500">患者：{record.patientName || '未命名'}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm text-gray-500">{record.age}岁 / {record.gender}</span>
                            <span className="text-gray-300">|</span>
                            <span className="text-sm text-gray-500">{new Date(record.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{record.result?.totalConfidence || 87}%</div>
                        <div className="text-xs text-gray-400">综合置信度</div>
                    </div>
                </div>
            </div>

            {/* 原始输入 */}
            <div className="glass-card p-5 mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">📝 原始输入</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{record.inputText}</p>
            </div>

            {/* 智能体结果 - 只显示有数据的 */}
            <div className="space-y-5">
                {record.result?.agents?.filter((a: any) => a.hasData !== false).map((agent: any, i: number) => {
                    const info = getAgentInfo(agent.agent);
                    return (
                    <div key={i} className="glass-card card-lift p-5 slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* 智能体标题 */}
                        <div className={`flex items-center gap-3 mb-4 pb-3 border-b border-white/50`}>
                            <div className={`w-10 h-10 bg-gradient-to-br ${info.gradient} rounded-xl flex items-center justify-center text-white text-lg shadow-md`}>
                                {info.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800">{info.name}</h3>
                                <p className="text-xs text-gray-400">{info.desc}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-700">{Math.round((agent.confidence || 0.8) * 100)}%</div>
                                <div className="text-[10px] text-gray-400">置信度</div>
                            </div>
                        </div>

                        {/* 智能体分析内容 */}
                        {renderAgentSection(agent)}
                    </div>
                )})}
            </div>

            {/* 就近医院推荐 */}
            {record.result?.hospitalRecommendation?.needed && (
                <div className="glass-card card-lift p-5 slide-up mt-5" style={{ animationDelay: '0.5s' }}>
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/50">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-lg shadow-md">
                            🏥
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800">就近医院推荐</h3>
                            <p className="text-xs text-gray-400">{record.result.hospitalRecommendation.message}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium">
                            {record.result.hospitalRecommendation.urgency}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {record.result.hospitalRecommendation.hospitals?.map((h: any, hi: number) => (
                            <div key={hi} className="flex items-center gap-4 p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                                    {hi + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-gray-800 text-sm">{h.name}</h4>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{h.level}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {h.address} · 推荐科室：{h.dept}
                                        {h.distance !== '—' && <span className="ml-2 text-blue-500 font-medium">{h.distance}</span>}
                                    </p>
                                </div>
                                <a href={`tel:${h.phone}`} className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shrink-0">
                                    拨打电话
                                </a>
                            </div>
                        ))}
                    </div>
                    {!record.result.hospitalRecommendation.hasLocation && (
                        <p className="text-xs text-gray-400 mt-3 text-center">
                            💡 开启定位权限可获取更精确的医院距离信息
                        </p>
                    )}
                </div>
            )}

            {/* 免责声明 */}
            <div className="mt-8 p-4 bg-amber-50/80 backdrop-blur rounded-xl border border-amber-200 text-center">
                <p className="text-xs text-amber-700">
                    ⚠ 免责声明：本报告由AI智能体生成，仅供辅助参考，不能替代专业医生的诊断和治疗建议。
                    如有健康问题，请及时就医。
                </p>
            </div>
        </div>
    );
}