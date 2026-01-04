
import type { Niche, ContentPlanResult } from '../types';

function removeVietnameseTones(str: string): string {
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
    str = str.replace(/đ/g,"d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
    str = str.replace(/\u02C6|\u0306|\u031B/g, "");
    return str;
}

export function exportContentPlanToTxt(contentPlan: ContentPlanResult, nicheName: string) {
    if (!contentPlan || contentPlan.content_ideas.length === 0) {
        alert("Không có nội dung để xuất.");
        return;
    }

    let content = `KẾ HOẠCH NỘI DUNG CHI TIẾT\n`;
    content += `Ngách: ${nicheName}\n\n`;
    content += "========================================\n\n";

    contentPlan.content_ideas.forEach((idea, index) => {
        content += `Ý TƯỞNG VIDEO ${index + 1}\n`;
        content += `----------------------------------------\n`;
        content += `   > Tiêu đề (Original): ${idea.title.original}\n`;
        content += `   > Tiêu đề (Tiếng Việt): ${idea.title.translated}\n\n`;
        content += `   > Mở đầu (Hook):\n     ${idea.hook.replace(/\n/g, '\n     ')}\n\n`;
        content += `   > Các luận điểm chính:\n`;
        idea.main_points.forEach(point => {
            content += `     - ${point}\n`;
        });
        content += `\n`;
        content += `   > Gợi ý hình ảnh (Visuals):\n     ${idea.visual_suggestions.replace(/\n/g, '\n     ')}\n\n`;
        content += `   > Kêu gọi hành động (CTA):\n     ${idea.call_to_action.replace(/\n/g, '\n     ')}\n\n`;
        content += "========================================\n\n";
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const deAccentedName = removeVietnameseTones(nicheName);
    const sanitizedFileName = deAccentedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/gi, '');
    const filename = `content_plan_${sanitizedFileName}.txt`;

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function exportNicheToTxt(niche: Niche) {
    if (!niche) {
        alert("Không có dữ liệu niche để xuất.");
        return;
    }

    let content = `CHI TIẾT NGÁCH YOUTUBE: ${niche.niche_name.original.toUpperCase()}\n`;
    content += `Tiếng Việt: ${niche.niche_name.translated}\n`;
    content += "========================================\n\n";

    content += `1. MÔ TẢ NGÁCH:\n`;
    content += `----------------------------------------\n`;
    content += `${niche.description}\n\n`;

    content += `2. PHÂN TÍCH MÔ HÌNH SẢN XUẤT:\n`;
    content += `----------------------------------------\n`;
    content += `   - Điểm phù hợp: ${niche.production_analysis.suitability_score}/100\n`;
    content += `   - Lập luận: ${niche.production_analysis.reasoning}\n`;
    content += `   - Khả năng nhân rộng (Scalability): ${niche.production_analysis.scalability}\n\n`;

    content += `3. CHỈ SỐ THỊ TRƯỜNG:\n`;
    content += `----------------------------------------\n`;
    content += `   - Mức độ quan tâm: ${niche.analysis.interest_level.score}/100\n`;
    content += `     > Giải thích: ${niche.analysis.interest_level.explanation}\n\n`;
    content += `   - Tiềm năng kiếm tiền: ${niche.analysis.monetization_potential.score}/100\n`;
    content += `     > RPM dự kiến: ${niche.analysis.monetization_potential.rpm_estimate}\n`;
    content += `     > Giải thích: ${niche.analysis.monetization_potential.explanation}\n\n`;
    content += `   - Mức độ cạnh tranh: ${niche.analysis.competition_level.score}/100\n`;
    content += `     > Giải thích: ${niche.analysis.competition_level.explanation}\n\n`;
    content += `   - Tính bền vững: ${niche.analysis.sustainability.score}/100\n`;
    content += `     > Giải thích: ${niche.analysis.sustainability.explanation}\n\n`;

    content += `4. CHIẾN LƯỢC NỘI DUNG & ĐỐI TƯỢNG:\n`;
    content += `----------------------------------------\n`;
    content += `   - Đối tượng mục tiêu: ${niche.audience_demographics}\n`;
    content += `   - Chiến lược: ${niche.content_strategy}\n\n`;

    content += `5. TỪ KHÓA GỢI Ý (KEYWORDS):\n`;
    content += `----------------------------------------\n`;
    if (niche.target_keywords && niche.target_keywords.length > 0) {
        niche.target_keywords.forEach((kw, i) => {
            content += `   ${i + 1}. ${kw}\n`;
        });
    } else {
        content += `   (Không có dữ liệu từ khóa)\n`;
    }
    content += `\n`;

    content += `6. NGUỒN TƯ LIỆU THAM KHẢO:\n`;
    content += `----------------------------------------\n`;
    if (niche.content_sources && niche.content_sources.length > 0) {
        niche.content_sources.forEach((src, i) => {
            content += `   - ${src}\n`;
        });
    } else {
        content += `   - (Không có dữ liệu nguồn tư liệu)\n`;
    }
    content += `\n`;

    content += "========================================\n";
    content += `Xuất từ YouTube Niche Finder AI Tool\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const deAccentedName = removeVietnameseTones(niche.niche_name.original);
    const sanitizedFileName = deAccentedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/gi, '');
    const filename = `niche_analysis_${sanitizedFileName}.txt`;

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function exportTextToTxt(content: string, baseFileName: string) {
    if (!content) {
        alert("Không có nội dung để xuất.");
        return;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const deAccentedName = removeVietnameseTones(baseFileName);
    const sanitizedFileName = deAccentedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_.-]/gi, '');
    const filename = `${sanitizedFileName}.txt`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}
