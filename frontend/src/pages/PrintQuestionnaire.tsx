import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  text: string;
  sort_order: number;
}

interface Domain {
  key: string;
  title: string;
  questions: Question[];
}

interface QuestionnaireData {
  questionnaire: {
    code: string;
    title: string;
    minMonth: number;
    maxMonth: number;
  };
  version: string;
  structure: {
    domains: Domain[];
    overall_section?: Question[];
  };
}

interface ChildInfo {
  fullName: string;
  birthDate: string;
  gender: string;
  guardianName?: string;
  guardianPhone?: string;
}

export default function PrintQuestionnaire() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childId = searchParams.get('childId');

  const [data, setData] = useState<QuestionnaireData | null>(null);
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [qRes, cRes] = await Promise.all([
          api.get(`/questionnaires/versions/${id}`),
          childId ? api.get(`/children/${childId}`) : Promise.resolve(null),
        ]);

        setData(qRes.data);
        if (cRes) setChild(cRes.data);
        setLoading(false);
      } catch (error: any) {
        console.error('Load data error:', error);
        toast.error('Không thể tải dữ liệu');
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id, childId]);

  const handleDownload = () => {
    window.print();
    toast.info('Chọn "Save as PDF" trong hộp thoại in để lưu file');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.structure) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Không tìm thấy dữ liệu</p>
      </div>
    );
  }

  const { questionnaire, version, structure } = data;

  return (
    <div className="mx-auto max-w-[210mm] bg-white p-5 font-sans print:p-0">

      <div className="mb-5 border-b-2 border-black pb-2.5 text-center">
        <div className="mb-1 text-xl font-bold">{questionnaire.title}</div>
        <div className="text-sm text-gray-600">
          {questionnaire.code} - Độ tuổi: {questionnaire.minMonth}-{questionnaire.maxMonth} tháng
        </div>
        <div className="text-sm text-gray-600">Phiên bản: {version}</div>
      </div>

      <div className="mb-4 border border-gray-800 bg-gray-50 p-2.5">
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Họ và tên trẻ:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">
            {child?.fullName || '______________________________'}
          </div>
        </div>
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Ngày sinh:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">
            {child?.birthDate ? new Date(child.birthDate).toLocaleDateString('vi-VN') : '____ / ____ / ____'}
          </div>
        </div>
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Giới tính:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">
            {child?.gender === 'MALE' ? 'Nam' : child?.gender === 'FEMALE' ? 'Nữ' : '____________'}
          </div>
        </div>
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Người giám hộ:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">
            {child?.guardianName || '______________________________'}
          </div>
        </div>
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Số điện thoại:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">
            {child?.guardianPhone || '______________________________'}
          </div>
        </div>
        <div className="mb-1 flex">
          <div className="w-[150px] font-bold">Ngày đánh giá:</div>
          <div className="flex-1 border-b border-dotted border-gray-400">____ / ____ / ____</div>
        </div>
      </div>

      <div className="mb-4 border border-yellow-600 bg-yellow-50 p-2.5 text-xs">
        <div className="mb-1 font-bold">HƯỚNG DẪN ĐIỀN PHIẾU:</div>
        <ul className="m-0 pl-5">
          <li>
            Đọc kỹ từng câu hỏi và đánh dấu <strong>X</strong> vào ô tương ứng
          </li>
          <li>
            <strong>C</strong> = CÓ (10 điểm) | <strong>Đ</strong> = ĐÔI KHI (5 điểm) | <strong>K</strong> =
            KHÔNG/CHƯA (0 điểm)
          </li>
          <li>Viết rõ ràng, không tẩy xóa. Mỗi câu chỉ chọn 1 đáp án</li>
        </ul>
      </div>

      {structure.domains?.map((domain, idx) => (
        <div
          key={domain.key}
          className={`mb-8 [page-break-inside:avoid] ${idx > 0 ? '[page-break-before:always]' : ''}`}
        >
          <div className="mb-4 bg-gray-800 px-3 py-2 text-base font-bold uppercase text-white">{domain.title}</div>

          {domain.questions?.map((q) => (
            <div key={q.id} className="mb-3 flex items-start border-b border-gray-200 pb-2">
              <div className="mr-2 min-w-[25px] font-bold">{q.sort_order}.</div>
              <div className="flex-1 leading-snug">{q.text}</div>
              <div className="ml-2.5 flex items-center gap-4">
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-[18px] w-[18px] align-middle border-2 border-black"></span>
                  <span className="text-[13px] font-medium">C</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-[18px] w-[18px] align-middle border-2 border-black"></span>
                  <span className="text-[13px] font-medium">Đ</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-block h-[18px] w-[18px] align-middle border-2 border-black"></span>
                  <span className="text-[13px] font-medium">K</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {structure.overall_section && structure.overall_section.length > 0 && (
        <div className="mb-8 [page-break-before:always] [page-break-inside:avoid]">
          <div className="mb-4 bg-gray-800 px-3 py-2 text-base font-bold uppercase text-white">TỔNG QUAN</div>
          <div className="mb-4 border border-yellow-600 bg-yellow-50 p-2.5 text-xs">
            <p className="m-0">
              Đánh dấu X vào <strong>C</strong> (Có) hoặc <strong>K</strong> (Không), và <strong>giải thích</strong>{' '}
              trong ô bên dưới.
            </p>
          </div>

          {structure.overall_section.map((q, idx) => (
            <div key={q.id} className="mb-5 [page-break-inside:avoid]">
              <div className="mb-1 flex items-start border-b border-gray-200 pb-2">
                <div className="mr-2 min-w-[25px] font-bold">{idx + 1}.</div>
                <div className="flex-1 leading-snug">{q.text}</div>
                <div className="ml-2.5 flex items-center gap-4">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-[18px] w-[18px] align-middle border-2 border-black"></span>
                    <span className="text-[13px] font-medium">C</span>
                  </div>
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="inline-block h-[18px] w-[18px] align-middle border-2 border-black"></span>
                    <span className="text-[13px] font-medium">K</span>
                  </div>
                </div>
              </div>
              <div className="ml-[33px] min-h-[40px] border border-gray-300 p-1 text-[11px] text-gray-400">
                Giải thích (nếu có):
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 border border-gray-300 p-1 text-center font-mono text-[10px]">
        <div className="mb-1 font-bold">MÃ PHIẾU (Không ghi đè)</div>
        <div className="text-sm tracking-[3px]">
          QID:{id} | CODE:{questionnaire.code} | VER:{version}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-3 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
        >
          Quay lại
        </button>
        <button
          onClick={handleDownload}
          className="cursor-pointer rounded-lg border-none bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700"
        >
          Lưu PDF
        </button>
        <button
          onClick={() => {
            const handleAfterPrint = () => {
              window.removeEventListener('afterprint', handleAfterPrint);
              navigate(-1);
            };
            window.addEventListener('afterprint', handleAfterPrint);
            window.print();
          }}
          className="cursor-pointer rounded-lg border-none bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
        >
          In phiếu
        </button>
      </div>
    </div>
  );
}
