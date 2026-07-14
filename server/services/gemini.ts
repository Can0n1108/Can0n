// AI call encapsulation (Gemini API)
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const isValidKey = apiKey.startsWith('AIza') || apiKey.startsWith('AQ.');

export async function generateContent(prompt: string): Promise<string> {
    if (!isValidKey) {
        throw new Error('INVALID_API_KEY');
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
}

export interface AgentResult {
    agent: string;
    content: string;
    confidence: number;
    hasData: boolean;
}

export type AnalysisMode = 'quick' | 'full';

export async function runMultiAgentAnalysis(
    inputText: string,
    mode: AnalysisMode = 'full',
    onAgentComplete?: (agent: string, index: number, total: number) => void,
): Promise<AgentResult[]> {
    if (!isValidKey) {
        const results = generateMockAnalysis(inputText);
        const selectedResults = mode === 'quick' ? results.filter((_, index) => [0, 2, 4].includes(index)) : results;
        selectedResults.forEach((result, index) => onAgentComplete?.(result.agent, index, selectedResults.length));
        return selectedResults;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const agents = [
        {
            name: '症状分析',
            prompt: `你是一位资深临床诊断专家。请根据以下患者信息，分析可能的症状和体征，给出初步诊断方向。

患者信息：${inputText}

请以JSON格式返回（只返回JSON）：
{
  "primary_symptoms": ["主要症状1", "主要症状2"],
  "possible_conditions": [{"name": "可能疾病", "probability": "高/中/低", "reason": "依据"}],
  "urgency_level": "紧急/需关注/常规",
  "confidence": 0.85
}`,
        },
        {
            name: '检验解读',
            prompt: `你是一位临床检验专家。请根据以下患者信息，分析实验室检查和影像学发现。

患者信息：${inputText}

请以JSON格式返回（只返回JSON）：
{
  "abnormal_findings": [{"item": "异常指标", "value": "数值", "reference": "参考范围", "significance": "临床意义"}],
  "key_observations": ["关键发现1", "关键发现2"],
  "confidence": 0.80
}`,
        },
        {
            name: '风险评估',
            prompt: `你是一位医疗风险评估专家。请根据以下患者信息，进行全面的风险评估。

患者信息：${inputText}

请以JSON格式返回（只返回JSON）：
{
  "risk_level": "高风险/中等风险/低风险",
  "risk_factors": [{"factor": "风险因素", "severity": "高/中/低", "description": "说明"}],
  "complications_risk": ["可能的并发症1", "可能的并发症2"],
  "confidence": 0.82
}`,
        },
        {
            name: '治疗建议',
            prompt: `你是一位临床治疗专家。请根据以下患者信息，给出治疗和后续建议。

患者信息：${inputText}

请以JSON格式返回（只返回JSON）：
{
  "treatment_plan": [{"step": "治疗步骤", "detail": "详细说明", "priority": "紧急/重要/常规"}],
  "medication_suggestions": [{"drug": "建议药物类别", "note": "注意事项"}],
  "follow_up": ["随访建议1", "随访建议2"],
  "lifestyle_advice": ["生活建议1", "生活建议2"],
  "confidence": 0.83
}`,
        },
        {
            name: '通用医疗咨询',
            prompt: `你是一位全科医学专家，同时也是一位富有同理心的健康顾问。请根据以下患者信息，提供全面、专业的医疗咨询。

患者信息：${inputText}

请以自然、专业、易懂的语言，从以下几个方面进行综合回答：
1. 问题概述：简要说明患者描述的情况可能是什么
2. 详细解释：用通俗易懂的语言解释可能的病因、机制
3. 就医建议：建议看什么科室、做什么检查
4. 生活调理：给出日常生活中的注意事项和调理建议
5. 心理关怀：给予患者心理支持和鼓励

请以JSON格式返回：
{
  "question_summary": "患者问题的简短概括",
  "overview": "问题概述（100-200字）",
  "detailed_explanation": "详细解释（200-400字）",
  "department_recommendation": "推荐就诊科室",
  "examination_suggestions": ["建议检查1", "建议检查2"],
  "lifestyle_advice": ["生活建议1", "生活建议2", "生活建议3"],
  "psychological_support": "心理关怀话语（50-100字）",
  "key_points": ["要点1", "要点2", "要点3"],
  "confidence": 0.85
}`,
        },
    ];

    const selectedAgents = mode === 'quick'
        ? agents.filter((_, index) => [0, 2, 4].includes(index))
        : agents;
    const results: AgentResult[] = [];
    for (const [index, agent] of selectedAgents.entries()) {
        try {
            const result = await model.generateContent(agent.prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            results.push({
                agent: agent.name,
                content: JSON.stringify(parsed),
                confidence: parsed.confidence || 0.8,
                hasData: true,
            });
            onAgentComplete?.(agent.name, index, selectedAgents.length);
        } catch (err) {
            console.error(`智能体 ${agent.name} 分析失败:`, err);
            results.push({
                agent: agent.name,
                content: JSON.stringify({ error: '分析失败' }),
                confidence: 0,
                hasData: false,
            });
            onAgentComplete?.(agent.name, index, selectedAgents.length);
        }
    }
    return results;
}

// ============ 智能Mock数据生成 ============

interface PatientProfile {
    age: number;
    gender: string;
    hasFever: boolean;
    hasCough: boolean;
    hasBreath: boolean;
    hasPain: boolean;
    hasBlood: boolean;
    hasImaging: boolean;
    hasHeart: boolean;
    hasDiabetes: boolean;
    hasDigestive: boolean;
    hasHP: boolean;
    hasNumbness: boolean;
    hasVision: boolean;
    hypertension: boolean;
    cholesterol: boolean;
    feverTemp: number;
    hasHeadache: boolean;
    hasCold: boolean;
    hasInsomnia: boolean;
    hasFatigue: boolean;
    hasAllergy: boolean;
    hasBackPain: boolean;
    hasDiarrhea: boolean;
    hasAnxiety: boolean;
    hasDizziness: boolean;
    hasSkinIssue: boolean;
    hasWeightLoss: boolean;
    hasColdHands: boolean;
    hasStayUp: boolean;
    hasBadBreath: boolean;
    hasHairLoss: boolean;
    hasMouthUlcer: boolean;
    hasDryEyes: boolean;
    hasTinnitus: boolean;
    hasConstipation: boolean;
    hasNosebleed: boolean;
    hasToothache: boolean;
    hasEyeStrain: boolean;
    inputLength: number;
    hasED: boolean;
    hasMenstrual: boolean;
    hasUrinary: boolean;
    hasJoint: boolean;
    hasThyroid: boolean;
    hasDepression: boolean;
    hasMemory: boolean;
    hasSnoring: boolean;
    hasChestPain: boolean;
    hasLegCramp: boolean;
    hasNausea: boolean;
    hasSore: boolean;
    hasSwelling: boolean;
    hasBleeding: boolean;
    hasRash: boolean;
    hasItch: boolean;
    hasVoice: boolean;
    hasSweat: boolean;
    hasPalpitation: boolean;
    hasEdema: boolean;
    hasJaundice: boolean;
    hasCyanosis: boolean;
    hasTremor: boolean;
    hasSeizure: boolean;
    hasAppetite: boolean;
    hasThirst: boolean;
    hasUrination: boolean;
    hasBowel: boolean;
    hasSexual: boolean;
    hasPregnancy: boolean;
    hasMenopause: boolean;
    hasProstate: boolean;
    hasKidney: boolean;
    hasLiver: boolean;
    hasLung: boolean;
    hasBone: boolean;
    hasEye: boolean;
    hasEar: boolean;
    hasNose: boolean;
    hasThroat: boolean;
    hasDental: boolean;
    hasMental: boolean;
    hasSleep: boolean;
    hasNutrition: boolean;
    hasExercise: boolean;
    hasSubstance: boolean;
    hasVaccine: boolean;
    hasSurgery: boolean;
    hasGenetic: boolean;
    hasInfectious: boolean;
    hasAutoimmune: boolean;
    hasCancer: boolean;
    hasChronic: boolean;
    hasAcute: boolean;
    hasTrauma: boolean;
    hasBurns: boolean;
    hasPoisoning: boolean;
    hasBite: boolean;
    hasSting: boolean;
    hasFracture: boolean;
    hasDislocation: boolean;
    hasSprain: boolean;
    hasStrain: boolean;
    hasConcussion: boolean;
    hasEmergency: boolean;
}

function extractProfile(text: string): PatientProfile {
    const ageMatch = text.match(/(\d+)\s*岁/);
    return {
        age: ageMatch ? parseInt(ageMatch[1]) : 40,
        gender: /女/.test(text) ? '女' : '男',
        hasFever: /发烧|发热|体温|高热|°C|℃/.test(text),
        hasCough: /咳嗽|咳痰|咽痛|流涕|鼻塞|打喷嚏|喉咙/.test(text),
        hasBreath: /呼吸困难|气促|喘息|胸闷/.test(text),
        hasPain: /疼痛|胸痛|腹痛|头痛|上腹部|关节痛|牙痛|脖子痛|肩膀痛/.test(text),
        hasBlood: /白细胞|血小板|血红蛋白|血常规|中性粒细胞|CRP|血糖|胆固醇|LDL|HDL|HbA1c/.test(text),
        hasImaging: /CT|X光|MRI|超声|影像|胃镜|B超|心电图/.test(text),
        hasHeart: /高血压|血压|胆固醇|LDL|胸闷|心脏|心血管/.test(text),
        hasDiabetes: /糖尿|血糖|HbA1c|胰岛素/.test(text),
        hasDigestive: /胃|消化不良|反酸|烧心|胃镜|幽门|恶心|呕吐/.test(text),
        hasHP: /幽门螺杆菌|HP\s*阳性|HP\+/.test(text),
        hasNumbness: /麻木|手脚|刺痛/.test(text),
        hasVision: /视力模糊|视力/.test(text),
        hypertension: /高血压|血压.*高/.test(text),
        cholesterol: /胆固醇|LDL|HDL|血脂/.test(text),
        feverTemp: parseFloat(text.match(/体温\s*(\d+\.?\d*)/)?.[1] || text.match(/(\d+\.?\d*)\s*[°℃]/)?.[1] || '0'),
        hasHeadache: /头痛|头疼|偏头痛/.test(text),
        hasCold: /感冒|流鼻涕|鼻塞|打喷嚏|着凉/.test(text),
        hasInsomnia: /失眠|睡不着|入睡困难|睡眠差|多梦|易醒/.test(text),
        hasFatigue: /疲劳|乏力|没精神|困倦|没力气/.test(text),
        hasAllergy: /过敏|皮疹|瘙痒|荨麻疹|花粉|湿疹/.test(text),
        hasBackPain: /腰酸|腰痛|背痛|腰疼|腰肌劳损|腰椎|坐骨神经/.test(text),
        hasDiarrhea: /腹泻|拉肚子|拉稀|便秘|大便/.test(text),
        hasAnxiety: /焦虑|紧张|心慌|压力|情绪|抑郁|烦躁/.test(text),
        hasDizziness: /头晕|眩晕|天旋地转|头昏/.test(text),
        hasSkinIssue: /长痘|痘痘|痤疮|粉刺|黑头|皮肤/.test(text),
        hasWeightLoss: /减肥|体重|肥胖|减重|超重/.test(text),
        hasColdHands: /手脚冷|手脚冰凉|手冷脚冷|四肢冰凉|手脚发凉|怕冷|畏寒/.test(text),
        hasStayUp: /熬夜|通宵|晚睡|睡眠不足|作息不规律|夜猫子/.test(text),
        hasBadBreath: /口臭|口气|口腔异味|嘴里有味道/.test(text),
        hasHairLoss: /脱发|掉头发|发际线|斑秃|发量少|头发稀疏/.test(text),
        hasMouthUlcer: /口腔溃疡|口疮|嘴巴溃疡|嘴里长泡|嘴唇溃疡/.test(text),
        hasDryEyes: /眼干|干眼|眼睛干涩|视力疲劳|眼疲劳|眼涩/.test(text),
        hasTinnitus: /耳鸣|耳朵响|耳朵嗡嗡|耳朵叫/.test(text),
        hasConstipation: /便秘|排便困难|大便干燥|排便不畅|好几天没拉/.test(text),
        hasNosebleed: /流鼻血|鼻出血|鼻子出血/.test(text),
        hasToothache: /牙痛|牙疼|智齿|牙龈/.test(text),
        hasEyeStrain: /眼疲劳|视力疲劳|眼睛疲劳|用眼过度|看屏幕/.test(text),
        inputLength: text.length,
        hasED: /阳痿|勃起|性功能|ED|硬度|不举|阴茎|早泄|射精|性欲|性生活|性交/.test(text),
        hasMenstrual: /月经|痛经|经期|例假|大姨妈|姨妈|闭经|经量|白带|阴道|分泌物|妇科/.test(text),
        hasUrinary: /尿频|尿急|尿痛|尿血|血尿|小便|排尿|尿道|膀胱/.test(text),
        hasJoint: /关节|膝盖|手肘|踝|腕|肩|髋|股骨头|风湿|类风湿|痛风|尿酸/.test(text),
        hasThyroid: /甲状腺|甲亢|甲减|脖子粗|颈粗|T3|T4|TSH/.test(text),
        hasDepression: /抑郁|抑郁症|情绪低落|没兴趣|不想活|自杀|自残|心理|孤独/.test(text),
        hasMemory: /记性|记忆力|健忘|忘记|老年痴呆|痴呆|阿尔茨海默/.test(text),
        hasSnoring: /打呼噜|打鼾|打呼|呼吸暂停|睡眠呼吸/.test(text),
        hasChestPain: /胸痛|心口痛|左胸|心绞痛|胸部不适/.test(text),
        hasLegCramp: /腿抽筋|抽筋|腿麻|脚麻|腿疼|腿痛/.test(text),
        hasNausea: /恶心|反胃|想吐|干呕|呕吐/.test(text),
        hasSwelling: /水肿|浮肿|肿|胀|肿大/.test(text),
        hasRash: /皮疹|疹子|红斑|红点|疙瘩|包|风团|湿疹/.test(text),
        hasItch: /痒|瘙痒|皮痒|皮肤痒/.test(text),
        hasPalpitation: /心悸|心慌|心跳快|心跳|心律不齐|早搏/.test(text),
        hasAppetite: /食欲|胃口|不想吃|吃不下|暴食|厌食/.test(text),
        hasBowel: /大便|排便|黑便|便血|便血|痔疮|肛裂/.test(text),
        hasSexual: /性功能|性欲|勃起|早泄|阳痿|性冷淡|性生活/.test(text),
        hasPregnancy: /怀孕|孕妇|孕期|妊娠|孕/.test(text),
        hasMenopause: /更年期|绝经|潮热|盗汗|更年期/.test(text),
        hasProstate: /前列腺|前列腺|尿频|尿不尽|尿等待|夜尿/.test(text),
        hasKidney: /肾|肾脏|腰子|肾功能|肌酐|尿素氮/.test(text),
        hasLiver: /肝|肝脏|肝功能|转氨酶|ALT|AST|黄疸|乙肝/.test(text),
        hasLung: /肺|肺部|肺炎|肺结核|慢阻肺|COPD|哮喘/.test(text),
        hasTremor: /手抖|震颤|帕金森|发抖/.test(text),
        hasSleep: /睡眠|失眠|入睡|多梦|早醒|打鼾|嗜睡/.test(text),
        hasExercise: /运动|锻炼|健身|跑步|游泳/.test(text),
        hasSubstance: /抽烟|吸烟|喝酒|饮酒|酒精|毒品|药物依赖/.test(text),
        hasInfectious: /感染|发炎|红肿|化脓|发烧|发热/.test(text),
        hasAutoimmune: /免疫|红斑狼疮|强直|干燥综合征|硬皮病/.test(text),
        hasCancer: /肿瘤|癌|癌症|恶性|化疗|放疗|肿块/.test(text),
        hasChronic: /慢性|长期|反复|持续|多年|一直/.test(text),
        hasAcute: /突然|急性|剧烈|刚刚|刚才|今天|昨天/.test(text),
        hasTrauma: /受伤|摔|撞|碰|外伤|骨折|扭伤|砸/.test(text),
        hasSore: /酸痛|肌肉酸痛|全身酸痛|身体酸/.test(text),
        hasBleeding: /出血|流血|淤血|淤青|内出血/.test(text),
        hasVoice: /声音嘶哑|嗓子哑|说不出话|失声|喉咙痛/.test(text),
        hasSweat: /出汗|盗汗|多汗|冷汗|虚汗|自汗/.test(text),
        hasEdema: /水肿|浮肿|肿了|肿胀/.test(text),
        hasJaundice: /黄疸|眼睛黄|皮肤黄|尿黄/.test(text),
        hasCyanosis: /发紫|发青|紫绀|嘴唇紫/.test(text),
        hasSeizure: /抽搐|癫痫|羊癫疯|抽风/.test(text),
        hasThirst: /口渴|口干|想喝水|老想喝水/.test(text),
        hasUrination: /多尿|尿多|尿少|无尿|夜尿多/.test(text),
        hasBone: /骨头|骨骼|骨质|骨质疏松|骨密度/.test(text),
        hasEye: /眼|视力|白内障|青光眼|眼底/.test(text),
        hasEar: /耳朵|听力|耳鸣|耳聋|中耳炎/.test(text),
        hasNose: /鼻子|鼻塞|鼻炎|流鼻涕|鼻窦/.test(text),
        hasThroat: /喉咙|嗓子|咽喉|咽炎|扁桃体/.test(text),
        hasDental: /牙|牙齿|补牙|拔牙|蛀牙|龋齿/.test(text),
        hasMental: /精神|心理|情绪|焦虑|抑郁|紧张/.test(text),
        hasNutrition: /营养|饮食|吃|喝|补/.test(text),
        hasVaccine: /疫苗|接种|打针/.test(text),
        hasSurgery: /手术|开刀|术后|切除/.test(text),
        hasGenetic: /遗传|家族|基因|遗传病/.test(text),
        hasBurns: /烧伤|烫伤|灼伤/.test(text),
        hasPoisoning: /中毒|中毒|农药|毒药|食物中毒/.test(text),
        hasBite: /咬伤|被狗咬|被猫抓|动物咬伤/.test(text),
        hasSting: /蜇伤|蜂蛰|被蜜蜂|被马蜂/.test(text),
        hasFracture: /骨折|断了|骨裂|骨断/.test(text),
        hasDislocation: /脱臼|关节脱位|脱位/.test(text),
        hasSprain: /扭伤|扭到|崴脚/.test(text),
        hasStrain: /拉伤|肌肉拉伤|韧带拉伤/.test(text),
        hasConcussion: /脑震荡|撞到头|头部受伤/.test(text),
        hasEmergency: /急救|急诊|抢救|危重|严重/.test(text),
    };
}

function generateMockAnalysis(inputText: string): AgentResult[] {
    const p = extractProfile(inputText);

    // 智能体1：症状分析
    const symptoms: string[] = [];
    const conditions: { name: string; probability: string; reason: string }[] = [];
    let urgency = '常规';

    // ===== 小病例处理 =====
    if (p.hasHeadache && !p.hasFever) {
        symptoms.push('头痛');
        if (p.inputLength < 50) {
            conditions.push({ name: '紧张性头痛', probability: '高', reason: '最常见头痛类型，与压力、疲劳、姿势不良相关' });
            conditions.push({ name: '偏头痛', probability: '中', reason: '若为单侧搏动性头痛、伴恶心畏光需考虑' });
            conditions.push({ name: '颈部肌筋膜疼痛', probability: '中', reason: '长时间低头工作可导致颈源性头痛' });
            urgency = '常规';
        }
    }
    if (p.hasCold) {
        symptoms.push('鼻塞流涕');
        symptoms.push('打喷嚏');
        if (p.hasFever) symptoms.push('发热');
        conditions.push({ name: '普通感冒（上呼吸道感染）', probability: '高', reason: '鼻塞、流涕、打喷嚏是典型感冒症状，多为自限性' });
        conditions.push({ name: '过敏性鼻炎', probability: '中', reason: '若反复发作、无发热、有过敏史需考虑' });
        urgency = '常规';
    }
    if (p.hasInsomnia) {
        symptoms.push('睡眠障碍');
        if (p.inputLength < 50) {
            conditions.push({ name: '原发性失眠', probability: '高', reason: '排除器质性病因后，多与压力、不良睡眠习惯有关' });
            conditions.push({ name: '焦虑相关性失眠', probability: '中', reason: '焦虑情绪是失眠最常见诱因之一' });
            urgency = '需关注';
        }
    }
    if (p.hasFatigue && p.inputLength < 50) {
        symptoms.push('疲劳乏力');
        conditions.push({ name: '亚健康状态', probability: '高', reason: '作息不规律、压力大、缺乏运动导致' });
        conditions.push({ name: '贫血可能', probability: '中', reason: '持续性疲劳需排查贫血和甲状腺功能' });
        urgency = '常规';
    }
    if (p.hasAllergy) {
        symptoms.push('过敏症状');
        if (p.inputLength < 50) {
            conditions.push({ name: '过敏性皮炎/荨麻疹', probability: '高', reason: '皮疹伴瘙痒是典型过敏反应' });
            conditions.push({ name: '接触性皮炎', probability: '中', reason: '需排查接触物过敏原' });
            urgency = '常规';
        }
    }
    if (p.hasBackPain && p.inputLength < 50) {
        symptoms.push('腰/背部疼痛');
        conditions.push({ name: '腰肌劳损', probability: '高', reason: '长期久坐或姿势不当引起，最常见腰痛原因' });
        conditions.push({ name: '腰椎间盘突出', probability: '中', reason: '若伴下肢放射痛需考虑' });
        urgency = '需关注';
    }
    if (p.hasDiarrhea && p.inputLength < 50) {
        symptoms.push('消化道症状');
        conditions.push({ name: '急性胃肠炎', probability: '高', reason: '饮食不当引起，多为自限性' });
        conditions.push({ name: '肠易激综合征', probability: '中', reason: '反复发作、与情绪相关时需考虑' });
        urgency = '常规';
    }
    if (p.hasAnxiety && p.inputLength < 50) {
        symptoms.push('焦虑/紧张');
        conditions.push({ name: '焦虑状态', probability: '高', reason: '工作生活压力导致，可伴心慌、失眠等躯体症状' });
        conditions.push({ name: '自主神经功能紊乱', probability: '中', reason: '长期焦虑可导致交感神经过度兴奋' });
        urgency = '需关注';
    }
    if (p.hasDizziness && p.inputLength < 50) {
        symptoms.push('头晕/眩晕');
        conditions.push({ name: '良性阵发性位置性眩晕', probability: '高', reason: '最常见眩晕原因，与体位变化有关' });
        conditions.push({ name: '颈椎病相关眩晕', probability: '中', reason: '长时间低头工作可压迫椎动脉导致' });
        conditions.push({ name: '低血压/贫血', probability: '中', reason: '需测量血压和血常规排除' });
        urgency = '需关注';
    }
    if (p.hasSkinIssue) {
        symptoms.push('皮肤问题');
        conditions.push({ name: '寻常痤疮', probability: '高', reason: '青春期常见，与激素水平、皮脂分泌旺盛有关' });
        conditions.push({ name: '毛囊炎', probability: '中', reason: '细菌感染毛囊引起' });
        urgency = '常规';
    }
    if (p.hasColdHands && p.inputLength < 80) {
        symptoms.push('手脚冰凉');
        conditions.push({ name: '末梢循环不良', probability: '高', reason: '手脚冰凉最常见原因，与血液循环、代谢率有关，多为良性' });
        conditions.push({ name: '中医阳虚体质', probability: '中', reason: '从中医角度，手脚冰凉常与阳气不足、气血运行不畅相关' });
        urgency = '常规';
    }
    if (p.hasStayUp && p.inputLength < 80) {
        symptoms.push('作息不规律');
        conditions.push({ name: '睡眠剥夺综合征', probability: '高', reason: '长期熬夜导致睡眠不足，影响身体修复和免疫功能' });
        conditions.push({ name: '昼夜节律紊乱', probability: '中', reason: '作息不规律打乱生物钟，可导致内分泌失调' });
        urgency = '常规';
    }
    if (p.hasBadBreath && p.inputLength < 80) {
        symptoms.push('口腔异味');
        conditions.push({ name: '口腔卫生不良/牙周问题', probability: '高', reason: '口臭80%以上由口腔问题引起，如牙菌斑、牙结石、龋齿' });
        conditions.push({ name: '消化功能紊乱', probability: '中', reason: '胃食管反流、消化不良也可导致口臭' });
        urgency = '常规';
    }
    if (p.hasHairLoss && p.inputLength < 80) {
        symptoms.push('脱发');
        conditions.push({ name: '雄激素性脱发', probability: '高', reason: '最常见脱发类型，与遗传和激素水平相关' });
        conditions.push({ name: '休止期脱发', probability: '中', reason: '压力、熬夜、营养不良等可导致暂时性脱发增多' });
        urgency = '常规';
    }
    if (p.hasMouthUlcer && p.inputLength < 80) {
        symptoms.push('口腔溃疡');
        conditions.push({ name: '复发性阿弗他溃疡', probability: '高', reason: '最常见口腔溃疡类型，与免疫、压力、维生素缺乏有关' });
        conditions.push({ name: '创伤性溃疡', probability: '中', reason: '牙齿咬伤、食物划伤等物理损伤导致' });
        urgency = '常规';
    }
    if (p.hasDryEyes && p.inputLength < 80) {
        symptoms.push('眼干/眼涩');
        conditions.push({ name: '干眼症', probability: '高', reason: '长时间使用电子屏幕、眨眼减少导致泪液蒸发过快' });
        conditions.push({ name: '视频终端综合征', probability: '中', reason: '长时间注视屏幕导致眼疲劳、干涩、视力模糊' });
        urgency = '常规';
    }
    if (p.hasTinnitus && p.inputLength < 80) {
        symptoms.push('耳鸣');
        conditions.push({ name: '神经性耳鸣', probability: '高', reason: '疲劳、压力、睡眠不足是常见诱因，多为暂时性' });
        conditions.push({ name: '颈椎病相关耳鸣', probability: '中', reason: '颈椎问题压迫血管神经可导致耳鸣' });
        urgency = p.hasDizziness ? '需关注' : '常规';
    }
    if (p.hasConstipation && p.inputLength < 80) {
        symptoms.push('便秘');
        conditions.push({ name: '功能性便秘', probability: '高', reason: '饮食纤维不足、饮水少、缺乏运动是主要原因' });
        conditions.push({ name: '肠易激综合征(便秘型)', probability: '中', reason: '若伴腹痛、排便不尽感需考虑' });
        urgency = '常规';
    }
    if (p.hasNosebleed && p.inputLength < 80) {
        symptoms.push('鼻出血');
        conditions.push({ name: '鼻黏膜干燥/破裂', probability: '高', reason: '干燥环境、抠鼻、鼻炎等导致鼻黏膜血管破裂' });
        conditions.push({ name: '高血压相关鼻出血', probability: '中', reason: '若反复发作或出血量大，需排查血压和凝血功能' });
        urgency = '常规';
    }
    if (p.hasToothache && p.inputLength < 80) {
        symptoms.push('牙痛');
        conditions.push({ name: '龋齿/牙髓炎', probability: '高', reason: '牙痛最常见原因，龋坏深入牙髓引起疼痛' });
        conditions.push({ name: '智齿冠周炎', probability: '中', reason: '智齿萌出不全，牙龈覆盖形成盲袋导致感染' });
        urgency = '常规';
    }
    if (p.hasEyeStrain && p.inputLength < 80) {
        symptoms.push('眼疲劳');
        conditions.push({ name: '视疲劳综合征', probability: '高', reason: '长时间近距离用眼导致睫状肌痉挛，引起眼胀、头痛' });
        conditions.push({ name: '屈光不正未矫正', probability: '中', reason: '近视、散光未正确矫正可加重眼疲劳' });
        urgency = '常规';
    }
    if (p.hasED) {
        symptoms.push('勃起功能异常');
        if (p.inputLength < 80) {
            conditions.push({ name: '勃起功能障碍(ED)', probability: '高', reason: '患者自述勃起困难，可分为心理性、器质性或混合性，需进一步检查明确' });
            conditions.push({ name: '睾酮水平低下', probability: '中', reason: '性激素异常是ED常见器质性病因，建议检测血睾酮水平' });
            conditions.push({ name: '心理性ED', probability: '中', reason: '焦虑、压力、抑郁等心理因素可导致或加重ED' });
            urgency = '需关注';
        }
    }

    // ===== 原有大病例处理 =====
    if (p.hasFever) {
        symptoms.push(p.feverTemp > 38.5 ? '高热（>' + p.feverTemp + '°C）' : '发热');
        if (!p.hasCough && !p.hasDigestive && !p.hasHeart && !p.hasDiabetes) {
            // 仅有发热，无其他明确伴随症状时，给出常见发热原因
            conditions.push({ name: '急性上呼吸道感染（早期）', probability: '高', reason: '发热是上呼吸道感染最常见的首发症状，常先于咳嗽、咽痛出现' });
            conditions.push({ name: '病毒性感染', probability: '高', reason: '多数急性发热由病毒感染引起，多为自限性' });
            conditions.push({ name: '待观察', probability: '中', reason: '单一发热症状信息有限，需观察是否出现其他伴随症状' });
            urgency = p.feverTemp > 38.5 ? '需关注' : '常规';
        }
    }
    if (p.hasCough) {
        symptoms.push('咳嗽咳痰');
        if (p.hasFever) {
            symptoms.push('咽痛');
            conditions.push({ name: '急性上呼吸道感染', probability: '高', reason: '发热、咳嗽、咽痛三联征，符合上呼吸道感染特征' });
            conditions.push({ name: '急性支气管炎', probability: '中', reason: '咳嗽咳痰为主，需听诊肺部' });
            conditions.push({ name: '社区获得性肺炎', probability: '低', reason: '无呼吸困难，但高热需警惕' });
            urgency = p.feverTemp > 38.5 ? '需关注' : '常规';
        } else {
            conditions.push({ name: '急性支气管炎', probability: '高', reason: '单纯咳嗽咳痰，无发热，可能为病毒性支气管炎' });
            conditions.push({ name: '过敏性咳嗽', probability: '中', reason: '无发热的慢性咳嗽需排查过敏因素' });
            urgency = '常规';
        }
    }
    if (p.hasBreath) {
        symptoms.push('胸闷/呼吸困难');
        if (p.hasHeart) {
            conditions.push({ name: '冠心病/心绞痛', probability: '中', reason: '胸闷+心血管危险因素，需心电图排除' });
            conditions.push({ name: '高血压性心脏病', probability: '中', reason: '长期高血压病史，心脏负荷增加' });
            urgency = '需关注';
        }
    }
    if (p.hasPain) {
        symptoms.push(p.hasDigestive ? '上腹部疼痛' : '疼痛症状');
        if (p.hasDigestive) {
            conditions.push({ name: '慢性胃炎', probability: '高', reason: '上腹痛+反酸烧心，符合慢性胃炎表现' });
            conditions.push({ name: '消化性溃疡', probability: '中', reason: '进食后加重，Hp阳性需排查溃疡' });
            conditions.push({ name: '胃食管反流病', probability: '中', reason: '反酸烧心为主诉' });
            urgency = '需关注';
        }
    }
    if (p.hasDiabetes && p.hasNumbness) {
        symptoms.push('手脚麻木（糖尿病神经病变可能）');
        symptoms.push('视力模糊');
        conditions.push({ name: '2型糖尿病伴并发症', probability: '高', reason: '血糖控制不佳，HbA1c>8%，已出现神经病变症状' });
        conditions.push({ name: '糖尿病视网膜病变', probability: '中', reason: '视力模糊提示眼底病变可能' });
        urgency = '需关注';
    }
    if (!p.hasDigestive && !p.hasHeart && !p.hasDiabetes && !p.hasFever && !p.hasHeadache && !p.hasCold && !p.hasInsomnia && !p.hasFatigue && !p.hasAllergy && !p.hasBackPain && !p.hasDiarrhea && !p.hasAnxiety && !p.hasDizziness && !p.hasSkinIssue && !p.hasColdHands && !p.hasStayUp && !p.hasBadBreath && !p.hasHairLoss && !p.hasMouthUlcer && !p.hasDryEyes && !p.hasTinnitus && !p.hasConstipation && !p.hasNosebleed && !p.hasToothache && !p.hasEyeStrain && !p.hasED && !p.hasDepression && !p.hasMenstrual && !p.hasJoint && !p.hasUrinary && !p.hasChestPain) {
        symptoms.push('待分析症状');
        conditions.push({ name: '需综合分析', probability: '中', reason: `根据您描述的症状"${inputText.slice(0, 30)}"，需要结合更多临床信息进行综合判断，建议提供更详细的症状描述、持续时间和伴随症状` });
    }

    // 智能体2：检验解读
    const abnormalFindings: any[] = [];
    const keyObs: string[] = [];

    if (p.hasBlood) {
        const wbcMatch = inputText.match(/白细胞\s*(\d+\.?\d*)/);
        if (wbcMatch) {
            const wbc = parseFloat(wbcMatch[1]);
            if (wbc > 10) {
                abnormalFindings.push({ item: '白细胞计数', value: `${wbc}×10⁹/L`, reference: '4.0-10.0×10⁹/L', significance: '明显升高，提示存在细菌感染或急性炎症反应' });
            }
        }
        const neuMatch = inputText.match(/中性粒细胞.*?(\d+\.?\d*)%/);
        if (neuMatch) {
            const neu = parseFloat(neuMatch[1]);
            if (neu > 70) {
                abnormalFindings.push({ item: '中性粒细胞百分比', value: `${neu}%`, reference: '50%-70%', significance: '升高提示细菌感染，与白细胞升高一致' });
            }
        }
        if (p.hasDiabetes) {
            const gluMatch = inputText.match(/血糖\s*(\d+\.?\d*)/);
            if (gluMatch) {
                const glu = parseFloat(gluMatch[1]);
                abnormalFindings.push({ item: '空腹血糖', value: `${glu}mmol/L`, reference: '3.9-6.1mmol/L', significance: '显著升高，血糖控制严重不达标' });
            }
            const hba1cMatch = inputText.match(/HbA1c\s*(\d+\.?\d*)/);
            if (hba1cMatch) {
                const hba1c = parseFloat(hba1cMatch[1]);
                abnormalFindings.push({ item: '糖化血红蛋白(HbA1c)', value: `${hba1c}%`, reference: '<6.5%', significance: '反映近3个月血糖控制不佳，需调整治疗方案' });
            }
        }
        if (p.hasHeart) {
            const bpMatch = inputText.match(/血压\s*(\d+)\s*\/\s*(\d+)/);
            if (bpMatch) {
                const sys = parseInt(bpMatch[1]);
                const dia = parseInt(bpMatch[2]);
                abnormalFindings.push({ item: '血压', value: `${sys}/${dia}mmHg`, reference: '<140/90mmHg', significance: '高血压2级，血压控制不达标，增加心血管事件风险' });
            }
            const tcMatch = inputText.match(/胆固醇\s*(\d+\.?\d*)/);
            if (tcMatch) {
                const tc = parseFloat(tcMatch[1]);
                abnormalFindings.push({ item: '总胆固醇', value: `${tc}mmol/L`, reference: '<5.2mmol/L', significance: '高胆固醇血症，增加动脉粥样硬化风险' });
            }
            const ldlMatch = inputText.match(/LDL\s*(\d+\.?\d*)/);
            if (ldlMatch) {
                const ldl = parseFloat(ldlMatch[1]);
                abnormalFindings.push({ item: '低密度脂蛋白(LDL)', value: `${ldl}mmol/L`, reference: '<3.4mmol/L', significance: 'LDL显著升高，是冠心病主要危险因素' });
            }
        }
        keyObs.push('实验室检查显示多项指标异常，提示存在多系统受累');
    }
    if (p.hasHP) {
        abnormalFindings.push({ item: '幽门螺杆菌', value: '阳性', reference: '阴性', significance: 'Hp感染是慢性胃炎和消化性溃疡的重要病因，需要根除治疗' });
    }
    if (p.hasImaging) {
        keyObs.push('胃镜检查提示胃窦黏膜充血水肿，符合慢性胃炎内镜表现');
    }
    if (abnormalFindings.length === 0) {
        abnormalFindings.push({ item: '待提供检验数据', value: '暂无', reference: '-', significance: '当前未提供实验室检查数据，建议根据症状完善相关检查（如血常规、炎症指标等）' });
        keyObs.push('未提供检验数据，建议就医时完善检查');
    }

    // 智能体3：风险评估
    const riskFactors: any[] = [];
    const complications: string[] = [];
    let riskLevel = '低风险';

    if (p.hasFever) {
        if (p.hasCough) {
            riskFactors.push({ factor: '急性感染', severity: '中', description: '上呼吸道感染若不及时处理，可能进展为肺炎' });
            complications.push('肺炎', '感染性休克（罕见）');
            riskLevel = '中等风险';
        } else {
            riskFactors.push({ factor: '急性发热', severity: '低-中', description: '发热是机体对感染或炎症的正常防御反应，轻度发热通常为自限性' });
            complications.push('高热惊厥（儿童多见）', '脱水');
            riskLevel = p.feverTemp > 38.5 ? '中等风险' : '低风险';
        }
    }
    if (p.hasHeart && p.hypertension) {
        riskFactors.push({ factor: '高血压（未控制）', severity: '高', description: '长期高血压增加心脑血管事件风险，需立即干预' });
        if (p.cholesterol) {
            riskFactors.push({ factor: '高脂血症', severity: '中', description: '高LDL胆固醇加速动脉粥样硬化进程' });
        }
        riskFactors.push({ factor: '超重/肥胖', severity: '中', description: 'BMI增高增加代谢综合征风险' });
        complications.push('心肌梗死', '脑卒中', '心力衰竭');
        riskLevel = '高风险';
    }
    if (p.hasDiabetes) {
        riskFactors.push({ factor: '血糖控制不佳', severity: '高', description: 'HbA1c>8%提示近3个月血糖严重失控' });
        if (p.hasNumbness) {
            riskFactors.push({ factor: '糖尿病周围神经病变', severity: '中', description: '手脚麻木提示神经病变已发生，需积极干预' });
        }
        if (p.hasVision) {
            riskFactors.push({ factor: '糖尿病视网膜病变可能', severity: '中', description: '视力模糊需尽快眼科会诊' });
        }
        complications.push('糖尿病酮症酸中毒', '糖尿病肾病', '糖尿病足');
        riskLevel = '高风险';
    }
    if (p.hasDigestive && p.hasHP) {
        riskFactors.push({ factor: 'Hp感染', severity: '中', description: '幽门螺杆菌是胃癌I类致癌物，需根除治疗' });
        riskFactors.push({ factor: '慢性胃炎', severity: '中', description: '长期不治疗可能进展为萎缩性胃炎、肠化生' });
        complications.push('消化性溃疡', '胃黏膜萎缩', '胃癌（远期风险）');
        riskLevel = '中等风险';
    }
    if (riskFactors.length === 0) {
        if (p.hasHeadache) {
            riskFactors.push({ factor: '紧张性头痛', severity: '低', description: '最常见原发性头痛，预后良好，但需排除继发性病因' });
            riskLevel = '低风险';
        } else if (p.hasInsomnia) {
            riskFactors.push({ factor: '慢性失眠', severity: '低-中', description: '长期失眠可增加心血管疾病和焦虑抑郁风险' });
            riskLevel = '低风险';
        } else if (p.hasAnxiety) {
            riskFactors.push({ factor: '焦虑状态', severity: '低-中', description: '未经干预的焦虑可发展为焦虑障碍，影响生活质量' });
            riskLevel = '低风险';
        } else if (p.hasDizziness) {
            riskFactors.push({ factor: '眩晕', severity: '低-中', description: '需排查颈椎病、脑血管病变等潜在病因' });
            riskLevel = '低风险';
        } else if (p.hasBackPain) {
            riskFactors.push({ factor: '慢性腰痛', severity: '低', description: '多数为非特异性腰痛，但需排除腰椎间盘突出等器质性病变' });
            riskLevel = '低风险';
        } else if (p.hasED) {
            riskFactors.push({ factor: '勃起功能障碍', severity: '中', description: 'ED可能是心血管疾病的早期预警信号，需排查潜在血管病变' });
            riskFactors.push({ factor: '心理因素影响', severity: '中', description: '焦虑、抑郁等心理问题可加重ED，形成恶性循环' });
            complications.push('心血管疾病', '糖尿病', '代谢综合征');
            riskLevel = '中风险';
        } else {
            riskFactors.push({ factor: '需进一步评估', severity: '低', description: `根据您提供的信息"${inputText.slice(0, 30)}"，当前信息有限，建议就医进行全面评估以明确风险等级` });
            complications.push('需结合检查结果评估');
        }
    }

    // 智能体4：治疗方案
    const treatmentPlan: any[] = [];
    const medication: any[] = [];
    const followUp: string[] = [];
    const lifestyle: string[] = [];

    if (p.hasFever) {
        if (p.hasCough) {
            treatmentPlan.push({ step: '抗感染治疗', detail: '根据血常规结果，白细胞和中性粒细胞升高提示细菌感染，可考虑使用抗生素（如阿莫西林或头孢类），需在医生指导下使用', priority: '重要' });
            treatmentPlan.push({ step: '对症治疗', detail: '体温>38.5°C时使用退热药（对乙酰氨基酚），咳嗽严重可使用止咳化痰药', priority: '重要' });
            medication.push({ drug: '抗生素类', note: '需确认无过敏史，疗程7-10天' });
            medication.push({ drug: '解热镇痛药', note: '体温>38.5°C时使用，避免过量' });
            followUp.push('3-5天后复诊评估疗效', '如持续高热或出现呼吸困难立即就医');
            lifestyle.push('充分休息，保证充足睡眠', '多饮温水，每日>2000ml', '清淡饮食，避免辛辣刺激');
        } else {
            treatmentPlan.push({ step: '物理降温', detail: '体温<38.5°C时优先物理降温：温水擦浴、冷敷额头，多饮水促进排汗', priority: '重要' });
            treatmentPlan.push({ step: '观察病情', detail: '密切观察体温变化和是否出现咳嗽、咽痛、乏力等新症状', priority: '重要' });
            treatmentPlan.push({ step: '对症用药', detail: '体温>38.5°C时可服用对乙酰氨基酚或布洛芬退热，注意用药间隔', priority: '常规' });
            medication.push({ drug: '对乙酰氨基酚/布洛芬', note: '体温>38.5°C时按需服用，24小时内不超过4次' });
            followUp.push('若发热持续超过3天需就医', '如出现高热(>39°C)、寒战、呼吸困难立即就医');
            lifestyle.push('充分休息，保证充足睡眠', '多饮温水，每日>2000ml', '清淡饮食，避免辛辣油腻', '保持室内通风，适当增减衣物');
        }
    }
    if (p.hasHeart) {
        treatmentPlan.push({ step: '降压治疗', detail: '当前血压160/95mmHg，建议启动或调整降压药方案（ACEI/ARB联合CCB）', priority: '紧急' });
        treatmentPlan.push({ step: '降脂治疗', detail: 'LDL>4.0mmol/L，建议启动他汀类药物治疗，目标LDL<2.6mmol/L', priority: '重要' });
        treatmentPlan.push({ step: '心血管评估', detail: '建议完善心电图、心脏超声、颈动脉超声等检查', priority: '重要' });
        medication.push({ drug: 'ACEI/ARB类降压药', note: '监测血压和肾功能，避免低血压' });
        medication.push({ drug: '他汀类降脂药', note: '监测肝功能和肌酸激酶' });
        medication.push({ drug: '阿司匹林', note: '评估出血风险后考虑使用' });
        followUp.push('2周后复查血压、血脂', '1个月后评估治疗效果', '每年心血管风险评估');
        lifestyle.push('低盐饮食（每日<5g盐）', '低脂饮食，减少动物脂肪摄入', '适度有氧运动（每周>150分钟）', '控制体重，目标BMI<24');
    }
    if (p.hasDiabetes) {
        treatmentPlan.push({ step: '强化降糖治疗', detail: 'HbA1c>8%，需调整降糖方案，考虑联合用药或胰岛素治疗', priority: '紧急' });
        treatmentPlan.push({ step: '并发症筛查', detail: '建议眼科会诊查眼底、神经传导速度检查、尿微量白蛋白检测', priority: '重要' });
        treatmentPlan.push({ step: '营养科会诊', detail: '制定个体化饮食方案，控制总热量摄入', priority: '重要' });
        medication.push({ drug: '二甲双胍', note: '基础用药，注意肾功能监测' });
        medication.push({ drug: 'SGLT-2抑制剂或GLP-1受体激动剂', note: '有心血管获益的新型降糖药' });
        followUp.push('1-2周后复查血糖谱', '3个月后复查HbA1c', '每年眼底、肾脏、神经筛查');
        lifestyle.push('控制碳水化合物摄入，定时定量', '每日监测血糖并记录', '适度运动，避免低血糖', '足部护理，每天检查');
    }
    if (p.hasDigestive) {
        treatmentPlan.push({ step: '根除Hp治疗', detail: '四联疗法14天：PPI+铋剂+两种抗生素', priority: '重要' });
        treatmentPlan.push({ step: '抑酸护胃', detail: '质子泵抑制剂（PPI）抑制胃酸分泌，促进黏膜修复', priority: '重要' });
        treatmentPlan.push({ step: '胃镜复查', detail: '根除治疗结束后4周复查C13呼气试验', priority: '常规' });
        medication.push({ drug: '质子泵抑制剂(PPI)', note: '早餐前30分钟服用，疗程4-8周' });
        medication.push({ drug: '铋剂四联（Hp根除）', note: '严格遵医嘱服药14天，不可中断' });
        medication.push({ drug: '胃黏膜保护剂', note: '餐后服用，保护胃黏膜' });
        followUp.push('Hp根除治疗结束后4周复查C13呼气试验', '症状反复需复查胃镜');
        lifestyle.push('规律饮食，定时定量', '避免辛辣、过烫、过冷食物', '戒烟限酒', '减少咖啡、浓茶摄入');
    }
    if (treatmentPlan.length === 0) {
        // 小病例处理
        if (p.hasHeadache) {
            treatmentPlan.push({ step: '休息与观察', detail: '保证充足睡眠，避免熬夜，注意工作姿势，可使用热敷颈部和肩部缓解紧张', priority: '重要' });
            treatmentPlan.push({ step: '对症用药', detail: '疼痛明显时可服用布洛芬或对乙酰氨基酚，注意不要空腹服用', priority: '常规' });
            medication.push({ drug: '布洛芬/对乙酰氨基酚', note: '按需服用，24小时内不超过4次，如持续不缓解需就医' });
            followUp.push('若头痛持续超过3天或加重需就医', '如出现剧烈头痛、呕吐、意识改变立即急诊');
            lifestyle.push('规律作息，避免熬夜', '保持正确坐姿，每工作1小时起身活动', '减少咖啡因和酒精摄入', '适当进行颈部拉伸运动');
        } else if (p.hasCold) {
            treatmentPlan.push({ step: '对症治疗', detail: '多休息、多饮水，鼻塞可用生理盐水喷鼻，发热超过38.5°C可服用退热药', priority: '重要' });
            treatmentPlan.push({ step: '观察病情', detail: '普通感冒多为自限性，5-7天可自愈，注意观察症状变化', priority: '常规' });
            medication.push({ drug: '复方感冒药', note: '缓解鼻塞流涕症状，注意不要与退热药重复使用' });
            followUp.push('若3-5天无好转或出现高热、呼吸困难需就医');
            lifestyle.push('充分休息，保证睡眠', '多饮温水，每日>2000ml', '清淡饮食，避免辛辣', '保持室内通风');
        } else if (p.hasInsomnia) {
            treatmentPlan.push({ step: '睡眠卫生调整', detail: '固定作息时间，避免睡前使用电子设备，睡前1小时放松身心', priority: '重要' });
            treatmentPlan.push({ step: '认知行为治疗', detail: '减少对失眠的焦虑，建立正确的睡眠认知', priority: '重要' });
            medication.push({ drug: '褪黑素', note: '短期使用辅助入睡，不建议长期依赖' });
            followUp.push('2周后评估睡眠改善情况', '若持续失眠超过1个月建议就医');
            lifestyle.push('固定作息时间，每天同一时间起床', '睡前1小时避免手机、电脑', '适度运动，但避免睡前剧烈运动', '营造安静舒适的睡眠环境');
        } else if (p.hasFatigue) {
            treatmentPlan.push({ step: '生活调整', detail: '调整作息，保证每天7-8小时睡眠，增加适度运动', priority: '重要' });
            treatmentPlan.push({ step: '排查病因', detail: '建议查血常规、甲状腺功能排除贫血和甲减', priority: '常规' });
            medication.push({ drug: '复合维生素B族', note: '辅助改善能量代谢，但不能替代正常作息' });
            followUp.push('2周后评估疲劳改善情况');
            lifestyle.push('均衡饮食，保证蛋白质摄入', '每周中等强度运动至少150分钟', '减少咖啡因依赖', '学会压力管理');
        } else if (p.hasAllergy) {
            treatmentPlan.push({ step: '抗过敏治疗', detail: '可口服抗组胺药（氯雷他定/西替利嗪），外用止痒药膏', priority: '重要' });
            treatmentPlan.push({ step: '避免过敏原', detail: '注意排查可能的过敏原（食物、花粉、尘螨、宠物等）', priority: '重要' });
            medication.push({ drug: '抗组胺药', note: '二代抗组胺药嗜睡副作用小，可按需服用' });
            followUp.push('若皮疹持续不退或加重需就医', '反复发作建议过敏原检测');
            lifestyle.push('避免已知过敏原', '保持皮肤清洁干燥', '穿着宽松棉质衣物', '避免搔抓，防止感染');
        } else if (p.hasBackPain) {
            treatmentPlan.push({ step: '物理治疗', detail: '热敷或冷敷腰部，适当拉伸，避免久坐久站', priority: '重要' });
            treatmentPlan.push({ step: '核心肌群锻炼', detail: '加强腰背核心肌群力量，改善姿势，减少复发', priority: '重要' });
            medication.push({ drug: '外用消炎镇痛药', note: '贴膏或凝胶局部使用，副作用小' });
            followUp.push('若疼痛持续2周以上需就医', '出现下肢麻木、无力需立即就医');
            lifestyle.push('保持正确坐姿和站姿', '避免长时间弯腰或久坐', '睡硬板床', '适度进行游泳、瑜伽等运动');
        } else if (p.hasDiarrhea) {
            treatmentPlan.push({ step: '补液治疗', detail: '口服补液盐或淡盐水补充水分和电解质，避免脱水', priority: '紧急' });
            treatmentPlan.push({ step: '饮食调整', detail: '暂时禁食6-8小时，之后从米汤、稀粥开始逐步恢复', priority: '重要' });
            medication.push({ drug: '蒙脱石散', note: '保护肠道黏膜，吸附毒素，饭前服用' });
            medication.push({ drug: '益生菌', note: '调节肠道菌群，饭后服用' });
            followUp.push('若腹泻超过2天或出现血便、高热需就医');
            lifestyle.push('注意饮食卫生，不吃生冷食物', '少食多餐，避免油腻食物', '勤洗手，注意个人卫生');
        } else if (p.hasAnxiety) {
            treatmentPlan.push({ step: '心理疏导', detail: '正视焦虑情绪，学习放松技巧（深呼吸、正念冥想）', priority: '重要' });
            treatmentPlan.push({ step: '生活方式调整', detail: '规律运动、充足睡眠、健康饮食有助于改善焦虑', priority: '重要' });
            medication.push({ drug: '不建议自行用药', note: '若影响日常生活，建议就医评估是否需要药物干预' });
            followUp.push('若焦虑持续超过2周影响生活建议就医');
            lifestyle.push('每天进行30分钟有氧运动', '练习腹式呼吸，每天5-10分钟', '减少咖啡因和酒精', '培养兴趣爱好，转移注意力');
        } else if (p.hasDizziness) {
            treatmentPlan.push({ step: '体位管理', detail: '避免快速转头和突然起身，动作放慢', priority: '重要' });
            treatmentPlan.push({ step: '排查病因', detail: '建议测量血压、查血常规、颈椎X光排除颈椎病', priority: '重要' });
            medication.push({ drug: '倍他司汀', note: '改善内耳微循环，请在医生指导下使用' });
            followUp.push('若眩晕伴呕吐、耳鸣需就医', '反复发作建议耳鼻喉科或神经内科就诊');
            lifestyle.push('避免突然改变体位', '减少低头看手机时间', '适度颈部运动', '保证充足睡眠');
        } else if (p.hasSkinIssue) {
            treatmentPlan.push({ step: '皮肤护理', detail: '保持面部清洁，使用温和洁面产品，避免挤压痘痘', priority: '重要' });
            treatmentPlan.push({ step: '饮食调整', detail: '减少高糖、高脂食物，增加蔬菜水果摄入', priority: '重要' });
            medication.push({ drug: '过氧化苯甲酰/水杨酸', note: '外用涂抹患处，从低浓度开始使用' });
            followUp.push('若2周无改善或加重建议皮肤科就诊');
            lifestyle.push('保持面部清洁，早晚各洗一次', '避免用手触摸面部', '减少甜食和油炸食品', '勤换枕巾和毛巾');
        } else if (p.hasColdHands) {
            treatmentPlan.push({ step: '改善循环', detail: '每天热水泡脚15-20分钟，水温40-45°C，促进末梢血液循环', priority: '重要' });
            treatmentPlan.push({ step: '饮食调理', detail: '多吃温性食物（生姜、红枣、桂圆、羊肉），补充铁质和维生素B12', priority: '重要' });
            medication.push({ drug: '无需药物治疗', note: '手脚冰凉多为体质问题，以生活方式调整为主' });
            followUp.push('若伴手指发白、发紫（雷诺现象）需就医');
            lifestyle.push('每天热水泡脚，促进血液循环', '坚持适度运动，如快走、跳绳', '冬季注意保暖，穿戴手套袜子', '按摩手脚，促进末梢循环', '避免久坐不动，每小时起身活动');
        } else if (p.hasStayUp) {
            treatmentPlan.push({ step: '调整作息', detail: '设定固定就寝时间，逐步提前30分钟入睡，目标23:00前入睡', priority: '重要' });
            treatmentPlan.push({ step: '睡前放松', detail: '睡前1小时远离屏幕，可听轻音乐、冥想或温水泡脚', priority: '重要' });
            medication.push({ drug: '褪黑素（短期辅助）', note: '可短期使用帮助调整生物钟，不建议长期依赖' });
            followUp.push('若调整2周后仍难以入睡建议就医');
            lifestyle.push('固定作息时间，23:00前入睡', '睡前1小时远离手机和电脑', '避免睡前摄入咖啡因', '白天适当晒太阳，帮助调节褪黑素', '熬夜后次日补觉不超过1小时');
        } else if (p.hasBadBreath) {
            treatmentPlan.push({ step: '口腔卫生管理', detail: '早晚刷牙、饭后漱口、使用牙线，每年洗牙1-2次', priority: '重要' });
            treatmentPlan.push({ step: '排查消化问题', detail: '若口腔卫生良好仍口臭，需排查胃食管反流、幽门螺杆菌感染', priority: '常规' });
            medication.push({ drug: '漱口水/口腔清新剂', note: '辅助清新口气，但不能替代口腔清洁' });
            followUp.push('若伴胃痛、反酸需消化内科就诊', '每年口腔检查和洗牙');
            lifestyle.push('早晚刷牙，每次至少2分钟', '使用牙线清洁牙缝', '多喝水，保持口腔湿润', '减少葱蒜、咖啡等刺激性食物', '每年洗牙1-2次');
        } else if (p.hasHairLoss) {
            treatmentPlan.push({ step: '头皮护理', detail: '使用温和洗发水，避免过度烫染，按摩头皮促进血液循环', priority: '重要' });
            treatmentPlan.push({ step: '营养补充', detail: '保证蛋白质、铁、锌、生物素摄入，必要时补充复合维生素', priority: '重要' });
            medication.push({ drug: '米诺地尔（外用）', note: '非处方生发药物，需持续使用3-6个月才见效' });
            followUp.push('若脱发持续加重建议皮肤科就诊');
            lifestyle.push('保证优质蛋白摄入（鸡蛋、鱼类、豆制品）', '减少熬夜，保证充足睡眠', '避免频繁烫染发', '用指腹轻轻按摩头皮', '补充富含铁、锌的食物');
        } else if (p.hasMouthUlcer) {
            treatmentPlan.push({ step: '局部护理', detail: '使用含氯己定的漱口水，避免辛辣刺激食物，口腔溃疡一般7-10天自愈', priority: '重要' });
            treatmentPlan.push({ step: '补充维生素', detail: '补充维生素B族和维生素C，有助于黏膜修复', priority: '常规' });
            medication.push({ drug: '口腔溃疡贴膜/凝胶', note: '局部止痛、促进愈合，饭前使用效果更好' });
            followUp.push('若溃疡超过2周不愈合需就医排除其他病变');
            lifestyle.push('避免辛辣、过烫食物', '补充维生素B族和维生素C', '保持口腔卫生', '减少压力，保证充足睡眠', '使用软毛牙刷避免损伤口腔黏膜');
        } else if (p.hasDryEyes) {
            treatmentPlan.push({ step: '人工泪液', detail: '使用不含防腐剂的人工泪液滴眼液，每天3-4次', priority: '重要' });
            treatmentPlan.push({ step: '用眼习惯调整', detail: '遵循20-20-20法则：每20分钟看远处20秒，多眨眼', priority: '重要' });
            medication.push({ drug: '人工泪液/玻璃酸钠滴眼液', note: '选择不含防腐剂的单支包装，方便携带使用' });
            followUp.push('若眼干持续加重或伴视力下降需眼科就诊');
            lifestyle.push('每20分钟远眺20秒，多眨眼', '调整屏幕亮度和对比度', '使用加湿器保持室内湿度', '避免空调直吹眼睛', '多吃富含omega-3的食物（深海鱼、亚麻籽）');
        } else if (p.hasTinnitus) {
            treatmentPlan.push({ step: '避免噪音', detail: '远离嘈杂环境，避免长时间佩戴耳机，音量不超过60%', priority: '重要' });
            treatmentPlan.push({ step: '放松训练', detail: '耳鸣常因焦虑加重，学习放松技巧，忽略耳鸣声音', priority: '重要' });
            medication.push({ drug: '银杏叶提取物', note: '改善内耳微循环，部分患者有效，需医生指导' });
            followUp.push('若耳鸣持续超过1周建议耳鼻喉科就诊', '伴听力下降需尽快就医');
            lifestyle.push('避免长时间佩戴耳机', '减少咖啡因和酒精摄入', '保证充足睡眠，减少疲劳', '适度颈部按摩缓解颈椎压力', '用白噪音（如风扇声）掩盖耳鸣帮助入睡');
        } else if (p.hasConstipation) {
            treatmentPlan.push({ step: '饮食调整', detail: '增加膳食纤维（蔬菜、水果、全谷物），每日饮水>2000ml', priority: '重要' });
            treatmentPlan.push({ step: '建立排便习惯', detail: '每天固定时间尝试排便，早餐后为最佳时间，不要强忍便意', priority: '重要' });
            medication.push({ drug: '乳果糖/聚乙二醇', note: '温和渗透性泻药，安全性高，可短期使用' });
            followUp.push('若便秘持续超过2周或伴腹痛、便血需就医');
            lifestyle.push('每日饮水2000ml以上', '多吃粗粮、蔬菜、水果', '每天适度运动，如快走30分钟', '养成固定排便习惯', '适当补充益生菌（酸奶、发酵食品）');
        } else if (p.hasNosebleed) {
            treatmentPlan.push({ step: '止血处理', detail: '身体前倾，用拇指和食指捏住鼻翼10-15分钟，冷敷鼻梁', priority: '重要' });
            treatmentPlan.push({ step: '鼻腔保湿', detail: '使用生理盐水喷鼻或凡士林涂抹鼻腔，保持鼻黏膜湿润', priority: '重要' });
            medication.push({ drug: '生理盐水鼻喷剂', note: '保持鼻腔湿润，预防鼻黏膜干燥破裂' });
            followUp.push('若鼻出血超过20分钟不止或反复发作需就医');
            lifestyle.push('保持室内湿度，使用加湿器', '避免抠鼻和用力擤鼻', '多饮水，保持身体水分', '多吃富含维生素C和K的食物');
        } else if (p.hasToothache) {
            treatmentPlan.push({ step: '临时止痛', detail: '可服用布洛芬缓解疼痛，冷敷面颊减轻肿胀', priority: '重要' });
            treatmentPlan.push({ step: '尽快就医', detail: '牙痛通常需要专业治疗（补牙、根管治疗或拔牙），建议尽快口腔科就诊', priority: '紧急' });
            medication.push({ drug: '布洛芬', note: '临时止痛，不能替代牙科治疗' });
            followUp.push('尽快预约口腔科就诊', '若伴面部肿胀、发热需立即就医');
            lifestyle.push('温盐水漱口保持口腔清洁', '避免患侧咀嚼', '避免过冷过热食物', '保持良好的口腔卫生习惯');
        } else if (p.hasEyeStrain) {
            treatmentPlan.push({ step: '科学用眼', detail: '遵循20-20-20法则，调整屏幕高度与眼睛平齐，距离50-70cm', priority: '重要' });
            treatmentPlan.push({ step: '眼部放松', detail: '每天热敷眼睛5-10分钟，做眼保健操，多户外活动', priority: '重要' });
            medication.push({ drug: '缓解视疲劳滴眼液', note: '选择不含防腐剂的温和配方，按需使用' });
            followUp.push('若眼胀、头痛持续需眼科检查屈光');
            lifestyle.push('遵循20-20-20用眼法则', '每天户外活动至少1小时', '调整屏幕亮度与环境光一致', '定期验光，确保眼镜度数合适', '热敷眼睛缓解疲劳');
        } else if (p.hasED) {
            treatmentPlan.push({ step: '明确病因', detail: '建议到男科/泌尿外科就诊，进行夜间勃起监测(NPT)、阴茎多普勒超声、性激素检测等检查', priority: '重要' });
            treatmentPlan.push({ step: '生活方式干预', detail: '戒烟限酒、规律运动、控制体重、管理血压血糖血脂，改善血管健康', priority: '重要' });
            treatmentPlan.push({ step: '心理疏导', detail: 'ED常伴焦虑情绪，可考虑伴侣共同参与心理咨询，减轻心理压力', priority: '建议' });
            medication.push({ drug: 'PDE5抑制剂（如西地那非）', note: '需在医生指导下使用，注意禁忌症（如服用硝酸酯类药物禁用）' });
            medication.push({ drug: '中医药调理', note: '根据辨证（肾阳虚、肾阴虚、肝郁气滞等）选用相应方剂' });
            followUp.push('完成性激素、血管功能检查', '若药物治疗无效，可考虑低能量冲击波治疗等物理疗法');
            lifestyle.push('戒烟限酒，烟草和酒精均损害血管功能', '坚持规律有氧运动，每周至少150分钟', '控制体重，BMI控制在24以下', '管理血压、血糖、血脂', '保证充足睡眠，避免熬夜', '适当补充锌、硒等微量元素');
        } else {
            treatmentPlan.push({ step: '就医评估', detail: `根据您描述的"${inputText.slice(0, 30)}"，建议前往医院进行专业评估和诊断`, priority: '重要' });
            treatmentPlan.push({ step: '完善检查', detail: '根据医生建议完善相关检查（如血常规、影像学等）以明确诊断', priority: '重要' });
            medication.push({ drug: '请遵医嘱', note: '在明确诊断前不建议自行用药，请就医后根据医生处方用药' });
            followUp.push('建议尽快就医评估', '根据诊断结果定期随访');
            lifestyle.push('保持充足休息', '清淡饮食，多饮水', '避免劳累和精神紧张');
        }
    }

    const hasRealSymptoms = conditions.length > 0;
    const hasRealLabData = abnormalFindings.length > 0;
    const hasRealRisk = riskFactors.length > 0;
    const hasRealTreatment = treatmentPlan.length > 0;

    // 智能体5：通用医疗咨询
    let generalConsultation: any = {};

    if (p.hasED) {
        generalConsultation = {
            question_summary: '勃起功能障碍相关问题咨询',
            overview: '您描述的情况属于勃起功能障碍（ED），是指阴茎持续不能达到或维持足够硬度的勃起以完成满意的性生活。这是一个非常常见的男性健康问题，40岁以上男性中约40%存在不同程度的ED。',
            detailed_explanation: 'ED的病因复杂，可分为心理性、器质性和混合性三类。心理因素包括焦虑、抑郁、压力、夫妻关系紧张等；器质性因素包括血管性（高血压、糖尿病、高血脂导致血管病变）、神经性（脊髓损伤、糖尿病神经病变）、内分泌性（睾酮水平低下、甲状腺功能异常）等。大多数ED患者是混合性的，既有器质性问题也有心理因素。中医认为ED多与肾虚、肝郁、血瘀、湿热等有关，需辨证论治。',
            department_recommendation: '男科（泌尿外科）',
            examination_suggestions: ['夜间阴茎勃起监测（NPT）', '阴茎多普勒超声检查', '性激素六项检测（睾酮、LH、FSH等）', '空腹血糖、血脂检查', '心理评估问卷（IIEF-5）'],
            lifestyle_advice: ['戒烟限酒，烟草和过量酒精均会损害血管功能', '坚持规律有氧运动，每周至少150分钟', '控制体重，肥胖是ED的重要危险因素', '管理血压、血糖、血脂，三高是ED最常见器质性病因', '保证充足睡眠，避免熬夜', '适当补充锌、硒等微量元素'],
            psychological_support: 'ED是常见的男性健康问题，您不必过度焦虑和羞耻。大多数ED是可以有效治疗的，关键在于及时就医查明原因。请相信专业医生，积极面对，您并不孤单。',
            key_points: ['ED是常见病，不要羞于就医', '大多ED可有效治疗', '需排除心血管疾病等潜在病因', '健康生活方式是基础', '心理因素与器质因素常并存'],
            confidence: 0.85,
        };
    } else if (p.hasDepression) {
        generalConsultation = {
            question_summary: '情绪低落/抑郁状态咨询',
            overview: '您描述的情绪状态符合抑郁倾向的特征。抑郁症是最常见的精神心理疾病之一，全球超过3亿人受其影响。它不是简单的"心情不好"，而是一种需要认真对待的疾病状态。',
            detailed_explanation: '抑郁症的病因涉及生物、心理、社会多方面因素。生物学上，大脑中5-羟色胺、去甲肾上腺素、多巴胺等神经递质失衡是关键机制。心理因素包括长期压力、创伤经历、人格特质等。社会因素如人际关系、工作压力、经济困难等也是重要诱因。抑郁症的核心症状包括持续情绪低落、兴趣减退、精力下降，可能伴有睡眠障碍、食欲改变、注意力不集中等。',
            department_recommendation: '精神心理科（或神经内科、临床心理科）',
            examination_suggestions: ['心理评估量表（PHQ-9、HAMD等）', '甲状腺功能检查（排除甲减）', '血常规和维生素B12检测', '必要时头颅MRI排除器质性疾病'],
            lifestyle_advice: ['保持规律作息，即使不想起床也要按时起床', '每天坚持30分钟以上有氧运动，运动是最好的天然抗抑郁药', '多晒太阳，阳光有助于调节情绪', '与信任的人交流感受，不要封闭自己', '避免酒精和咖啡因，它们可能加重症状'],
            psychological_support: '请记住，抑郁症是一种可以治疗的疾病，不是您的错，也不是软弱的表现。寻求帮助是勇敢的行为，而不是羞耻。您值得被关心和理解，康复之路虽然需要时间，但每一步都是向前的。',
            key_points: ['抑郁症是可治疗的疾病', '药物治疗结合心理治疗效果更好', '运动是有效的辅助治疗', '不要独自承受，寻求专业帮助', '康复需要时间，请给自己耐心'],
            confidence: 0.82,
        };
    } else if (p.hasMenstrual) {
        generalConsultation = {
            question_summary: '月经相关问题咨询',
            overview: '您描述的月经问题在女性中非常常见。月经周期的正常范围是21-35天，经期持续3-7天，经量约20-60ml。超出这个范围或伴随明显不适，需要关注。',
            detailed_explanation: '月经异常的原因多样，包括：内分泌失调（多囊卵巢综合征、甲状腺功能异常、高泌乳素血症）、子宫器质性病变（子宫肌瘤、子宫内膜息肉、子宫腺肌症）、卵巢功能减退（卵巢早衰、围绝经期）、以及压力、体重变化、剧烈运动等生活方式因素。痛经分为原发性和继发性，原发性痛经主要与前列腺素分泌过多有关，继发性痛经则需排查子宫内膜异位症等疾病。',
            department_recommendation: '妇科',
            examination_suggestions: ['妇科B超（子宫附件超声）', '性激素六项检测', '甲状腺功能检查', '宫颈TCT和HPV筛查（常规体检）'],
            lifestyle_advice: ['经期注意保暖，避免受凉', '适当补充铁质，预防贫血', '减少咖啡因和生冷食物摄入', '规律作息，避免熬夜', '适度运动如瑜伽、散步有助于缓解痛经'],
            psychological_support: '月经问题虽然困扰，但绝大多数是可以通过治疗改善的。请记录月经周期日记，帮助医生更准确地判断。您对身体的关注是关爱自己的表现。',
            key_points: ['月经周期21-35天为正常范围', '痛经需区分原发性和继发性', '建议做妇科B超排除器质性病变', '规律生活对月经调节很重要', '持续异常需及时就医'],
            confidence: 0.84,
        };
    } else if (p.hasJoint) {
        generalConsultation = {
            question_summary: '关节疼痛/不适咨询',
            overview: '关节疼痛是临床上最常见的症状之一，可发生于任何年龄。根据病因不同，可分为退行性（骨关节炎）、炎症性（类风湿关节炎、痛风）、外伤性、代谢性等类型。',
            detailed_explanation: '骨关节炎是最常见的关节疾病，与年龄增长、关节磨损、肥胖等因素相关，典型表现为活动后加重、休息后缓解。类风湿关节炎是自身免疫性疾病，表现为对称性小关节肿痛、晨僵。痛风则是尿酸结晶沉积在关节引起的急性炎症，常首发于大脚趾。不同病因的治疗方案完全不同，因此明确诊断至关重要。',
            department_recommendation: '骨科（或风湿免疫科）',
            examination_suggestions: ['关节X光检查', '血沉、C反应蛋白（炎症指标）', '类风湿因子、抗CCP抗体', '血尿酸检测', '必要时关节MRI'],
            lifestyle_advice: ['避免关节过度负重和剧烈运动', '游泳是关节友好的运动方式', '控制体重，减轻关节负荷', '注意保暖，避免受凉诱发疼痛', '适当补充钙和维生素D'],
            psychological_support: '关节疼痛可能影响日常活动，但通过正确的诊断和治疗，大多数关节问题可以得到良好控制。积极面对，科学治疗，生活质量会逐步改善。',
            key_points: ['明确诊断是治疗关节痛的关键', '不同类型关节炎治疗方案不同', '运动要适度，游泳是推荐运动', '控制体重可显著减轻关节负担', '持续疼痛需及时就医'],
            confidence: 0.83,
        };
    } else if (p.hasUrinary) {
        generalConsultation = {
            question_summary: '泌尿系统相关问题咨询',
            overview: '您描述的泌尿系统症状需要关注。常见原因包括尿路感染、前列腺问题（男性）、膀胱过度活动症、泌尿系统结石等。不同病因需要不同的处理方式。',
            detailed_explanation: '尿路感染是最常见原因，典型表现为尿频、尿急、尿痛，女性因尿道短更容易发生。男性前列腺增生或前列腺炎可导致排尿困难、尿频、夜尿增多。膀胱过度活动症表现为尿急、尿频、夜尿，但无感染证据。泌尿系统结石则可引起剧烈疼痛和血尿。',
            department_recommendation: '泌尿外科（或肾内科）',
            examination_suggestions: ['尿常规检查', '泌尿系统B超', '尿培养+药敏', '肾功能检查', 'PSA检测（男性>40岁）'],
            lifestyle_advice: ['多饮水，每日2000ml以上', '不憋尿，有尿意及时排尿', '注意个人卫生', '避免辛辣刺激食物', '穿宽松透气的棉质内裤'],
            psychological_support: '泌尿系统问题虽然让人不适，但大多数是可以通过治疗解决的。请不要因为尴尬而延误就医，早期治疗通常效果更好。',
            key_points: ['多饮水是最简单有效的预防措施', '尿路感染需及时抗感染治疗', '男性前列腺问题随年龄增长常见', '血尿需警惕，建议及时检查', '注意个人卫生预防感染'],
            confidence: 0.84,
        };
    } else {
        // 通用兜底回答
        generalConsultation = {
            question_summary: inputText.slice(0, 30) + (inputText.length > 30 ? '...' : ''),
            overview: '感谢您提供的信息。根据您的描述，这是一个需要专业医疗关注的健康问题。虽然当前信息有限，但我们可以从全科医学角度给出初步分析和建议。',
            detailed_explanation: '每个人的健康状况都是独特的，症状背后可能涉及多种因素。现代医学强调生物-心理-社会综合模式，身体的症状可能由器质性疾病、心理压力、生活方式等多种因素共同作用导致。中医则从整体观念出发，强调阴阳平衡、气血调和。无论从哪个角度，都需要全面的评估才能给出准确的判断。',
            department_recommendation: '建议先到全科/内科门诊进行初步评估',
            examination_suggestions: ['血常规、尿常规', '生化全项（肝肾功能、血糖、血脂等）', '根据具体症状选择相应专项检查'],
            lifestyle_advice: ['保持规律作息，充足睡眠', '均衡饮食，多摄入蔬菜水果', '适度运动，每周至少150分钟', '保持良好心态，学会压力管理', '记录症状变化，便于就医时提供准确信息'],
            psychological_support: '面对健康问题感到担忧是正常的。请相信，积极面对和科学就医是解决问题的最好方式。您已经迈出了重要的第一步，我们会陪伴您走好每一步。',
            key_points: ['建议先到全科门诊进行初步评估', '完善基础检查有助于明确诊断', '健康生活方式是疾病预防和治疗的基础', '保持积极心态，不要过度焦虑', '必要时转诊专科进一步诊治'],
            confidence: 0.80,
        };
    }

    return [
        { agent: '症状分析', content: JSON.stringify({ primary_symptoms: symptoms, possible_conditions: conditions, urgency_level: urgency, confidence: 0.85 }), confidence: 0.85, hasData: hasRealSymptoms },
        { agent: '检验解读', content: JSON.stringify({ abnormal_findings: abnormalFindings, key_observations: keyObs, confidence: 0.80 }), confidence: 0.80, hasData: hasRealLabData },
        { agent: '风险评估', content: JSON.stringify({ risk_level: riskLevel, risk_factors: riskFactors, complications_risk: complications, confidence: 0.82 }), confidence: 0.82, hasData: hasRealRisk },
        { agent: '治疗建议', content: JSON.stringify({ treatment_plan: treatmentPlan, medication_suggestions: medication, follow_up: followUp, lifestyle_advice: lifestyle, confidence: 0.83 }), confidence: 0.83, hasData: hasRealTreatment },
        { agent: '通用医疗咨询', content: JSON.stringify(generalConsultation), confidence: generalConsultation.confidence || 0.80, hasData: true },
    ];
}
