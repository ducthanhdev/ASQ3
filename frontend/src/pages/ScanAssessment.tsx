import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

interface OcrResult {
  status: string;
  result: {
    status: string;
    pages: Array<{
      frame_index: number;
      width: number;
      height: number;
      texts: Array<{
        text: string;
        bbox: number[];
        conf: number;
      }>;
    }>;
    full_text: string;
    confidence: number;
    total_frames: number;
  };
  ocrResultId: number;
  fileId: number;
}

interface Child {
  id: number;
  fullName: string;
  birthDate: string;
}

interface QuestionnaireVersion {
  id: number;
  version: string;
  questionnaire: {
    id: number;
    code: string;
    title: string;
  };
}

export default function ScanAssessment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('childId');
  const questionnaireVersionId = searchParams.get('questionnaireVersionId');

  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [ocrResultId, setOcrResultId] = useState<number | null>(null);
  const [parsedAnswers, setParsedAnswers] = useState<Record<string, string> | null>(null);
  const [creating, setCreating] = useState(false);
  const [child, setChild] = useState<Child | null>(null);
  const [questionnaireVersion, setQuestionnaireVersion] = useState<QuestionnaireVersion | null>(null);

  useEffect(() => {
    if (childId) {
      api.get(`/children/${childId}`).then((res) => {
        setChild(res.data);
      }).catch(() => {
        toast.error('Không thể tải thông tin trẻ');
      });
    }

    if (questionnaireVersionId) {
      api.get(`/questionnaires/versions/${questionnaireVersionId}`).then((res) => {
        setQuestionnaireVersion(res.data);
      }).catch((err) => {
        console.error('Error loading questionnaire version:', err);
        // Fallback: try to get from questionnaire
        api.get(`/questionnaires/${questionnaireVersionId}/version/latest`).then((res) => {
          setQuestionnaireVersion(res.data);
        }).catch(() => {
          toast.error('Không thể tải thông tin bảng câu hỏi');
        });
      });
    }
  }, [childId, questionnaireVersionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      setFiles(fileList);
      setOcrResults([]);
      setParsedAnswers(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Vui lòng chọn ít nhất một file');
      return;
    }

    if (!questionnaireVersionId) {
      toast.error('Vui lòng chọn bảng câu hỏi');
      return;
    }

    setUploading(true);
    const results: OcrResult[] = [];
    let lastOcrResultId: number | null = null;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        if (questionnaireVersionId) {
          formData.append('questionnaireVersionId', questionnaireVersionId.toString());
        }

        const response = await api.post('/api/ocr/recognize', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        results.push(response.data);
        lastOcrResultId = response.data.ocrResultId;
        
        toast.success(`Đã xử lý ${i + 1}/${files.length}: ${file.name}`);
      }

      setOcrResults(results);
      if (lastOcrResultId) {
        setOcrResultId(lastOcrResultId);
      }
      toast.success(`OCR thành công ${files.length} file!`);
    } catch (error: any) {
      console.error('OCR error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi xử lý OCR');
    } finally {
      setUploading(false);
    }
  };

  const handleParseAnswers = async () => {
    if (!ocrResultId || !questionnaireVersionId || ocrResults.length === 0) {
      toast.error('Thiếu thông tin cần thiết');
      return;
    }

    try {
      // Get all OCR result IDs from all uploaded images
      // Include ALL IDs, not just excluding the last one
      const allOcrResultIds = ocrResults
        .map((r) => r.ocrResultId)
        .filter((id) => id); // Just filter out null/undefined

      // Use first ID as main, rest as additional
      const mainOcrResultId = allOcrResultIds[0];
      const additionalIds = allOcrResultIds.slice(1); // All except first

      console.log('Parse request:', {
        mainOcrResultId,
        questionnaireVersionId,
        additionalIds,
        totalOcrResults: ocrResults.length,
        allOcrResultIds,
      });

      const response = await api.post('/api/ocr/parse', {
        ocrResultId: mainOcrResultId,
        questionnaireVersionId: parseInt(questionnaireVersionId),
        additionalOcrResultIds: additionalIds.length > 0 ? additionalIds : undefined,
      });

      setParsedAnswers(response.data.answers);
      toast.success('Đã parse answers thành công!');
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi parse answers');
    }
  };

  const handleCreateAssessment = async () => {
    if (!ocrResultId || !childId || !questionnaireVersionId) {
      toast.error('Thiếu thông tin cần thiết');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/api/ocr/create-assessment', {
        ocrResultId,
        childId: parseInt(childId),
        questionnaireVersionId: parseInt(questionnaireVersionId),
      });

      toast.success('Tạo assessment thành công!');
      navigate(`/assessments/${response.data.assessment.id}`);
    } catch (error: any) {
      console.error('Create assessment error:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tạo assessment');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Quét và OCR Phiếu Đánh Giá</h1>

      {/* Child & Questionnaire Info */}
      <Card className="p-4 mb-6">
        <div className="space-y-2">
          {child && (
            <div>
              <Label>Trẻ:</Label>
              <span className="ml-2 font-semibold">{child.fullName}</span>
            </div>
          )}
          {questionnaireVersion && (
            <div>
              <Label>Bảng câu hỏi:</Label>
              <span className="ml-2 font-semibold">
                {questionnaireVersion.questionnaire.title} (v{questionnaireVersion.version})
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Upload Section */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Chọn nhiều file scan (ảnh/PDF) - Giữ Ctrl/Cmd để chọn nhiều</Label>
            <input
              id="file"
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-700">
                Đã chọn {files.length} file:
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full"
          >
            {uploading ? `Đang xử lý OCR... (${files.length} file)` : `Upload và OCR (${files.length} file)`}
          </Button>
        </div>
      </Card>

      {/* OCR Results */}
      {ocrResults.length > 0 && (
        <div className="space-y-4 mb-6">
          {ocrResults.map((ocrResult, resultIdx) => (
            <Card key={resultIdx} className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Kết quả OCR - File {resultIdx + 1}: {files[resultIdx]?.name}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <Label>Độ tin cậy trung bình:</Label>
                  <span className="ml-2">
                    {(ocrResult.result.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                <div>
                  <Label>Số frames:</Label>
                  <span className="ml-2">{ocrResult.result.total_frames}</span>
                </div>

                <div>
                  <Label>Text đã nhận dạng:</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded border max-h-64 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {ocrResult.result.full_text}
                    </pre>
                  </div>
                </div>

                <div>
                  <Label>Chi tiết nhận dạng:</Label>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {ocrResult.result.pages.map((page: any, pageIdx: number) => (
                      <div key={pageIdx} className="border-b pb-2">
                        <div className="text-sm font-semibold mb-1">
                          Frame {page.frame_index + 1} ({page.width}x{page.height})
                        </div>
                        <div className="space-y-1">
                          {page.texts.map((textItem: any, idx: number) => (
                            <div key={idx} className="text-xs text-gray-600">
                              <span className="font-mono">{textItem.text}</span>
                              <span className="ml-2 text-gray-400">
                                ({(textItem.conf * 100).toFixed(0)}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Parsed Answers */}
      {parsedAnswers && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Answers đã parse</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(parsedAnswers).map(([qId, answer]) => (
              <div key={qId} className="flex justify-between border-b pb-1">
                <span className="text-sm">{qId}:</span>
                <span className="font-semibold">{answer}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      {ocrResults.length > 0 && (
        <Card className="p-6">
          <div className="flex gap-4">
            <Button
              onClick={handleParseAnswers}
              disabled={!ocrResultId || !questionnaireVersionId}
              variant="outline"
            >
              Parse Answers (từ file cuối)
            </Button>
            <Button
              onClick={handleCreateAssessment}
              disabled={!ocrResultId || !childId || !questionnaireVersionId || creating}
              className="flex-1"
            >
              {creating ? 'Đang tạo...' : 'Tạo Assessment từ OCR (file cuối)'}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Lưu ý: Hiện tại chỉ parse và tạo assessment từ file cuối cùng. Có thể cải thiện để merge tất cả files sau.
          </p>
        </Card>
      )}
    </div>
  );
}

