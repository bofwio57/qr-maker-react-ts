import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react"; // QR 코드를 렌더링하기 위한 컴포넌트
import { toPng, toJpeg } from "html-to-image"; // 이미지 파일로 변환
// UI에 사용될 아이콘들
import { Download, Settings, Link as LinkIcon, Palette, Maximize, RefreshCw, Check, Type, Layout, FileText, History, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion"; // 애니메이션 효과

// --- [타입 정의 영역] ---
type QrType = "url" | "text";
type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
type ImageFormat = "svg" | "png" | "jpg";

// 히스토리 항목 객체의 구조(Interface) 정의
interface HistoryItem {
    id: string;
    type: QrType;
    value: string;
    timestamp: number;
}
// ----------------------

export default function App() {
    // 입력
    // 제네릭(<T>)을 사용하여 각 상태의 타입을 명시
    const [qrType, setQrType] = useState<QrType>("url");
    const [url, setUrl] = useState<string>("");
    const [text, setText] = useState<string>("");

    // 디자인 설정
    const [size, setSize] = useState<number>(204); // QR 코드 기본 크기
    const [fgColor, setFgColor] = useState<string>("#000000"); // QR 코드 색상
    const [bgColor, setBgColor] = useState<string>("#ffffff"); // 배경 색상
    const [logo, setLogo] = useState<string | null>(null); // 중앙에 들어갈 로고 이미지
    const [logoSize] = useState<number>(40); // 로고 크기
    const [level, setLevel] = useState<ErrorCorrectionLevel>("H");

    // 히스토리(기록) 상태: 초기값은 브라우저의 localStorage에서 불러옴
    const [history, setHistory] = useState<HistoryItem[]>(() => {
        const saved = localStorage.getItem("qr_history");
        return saved ? JSON.parse(saved) : [];
    });

    // useRef에 HTML 요소 타입을 명시
    const qrRef = useRef<HTMLDivElement>(null); // 캡처할 QR 코드 영역 : 요소가 div라 HTMLDivElement
    const fileInputRef = useRef<HTMLInputElement>(null); // 로고파일을 위해 : 요소가 input라 HTMLInputElement

    // 현재 탭(URL 또는 Text)에 따라 실제 QR 코드에 들어갈 값을 반환
    const getQRValue = (): string => {
        switch (qrType) {
            case "url":
                return url || " "; // 빈 값이면 에러가 남 > 공백 반환
            case "text":
                return text || " ";
            default:
                return " ";
        }
    };

    // 다운로드 시 현재 QR 코드를 로컬과 히스토리에 저장
    const addToHistory = () => {
        const value = getQRValue();
        if (!value.trim()) return; // 빈 값이면 추가하지 않음

        const newItem: HistoryItem = {
            id: Math.random().toString(36).slice(2, 11), // 고유 ID 만들기
            type: qrType,
            value: value,
            timestamp: Date.now(),
        };

        // 최신 항목을 맨 앞에 추가하고, 최대 10개까지만 유지
        const newHistory = [newItem, ...history].slice(0, 10);
        setHistory(newHistory);
        localStorage.setItem("qr_history", JSON.stringify(newHistory)); // localStorage에 저장
    };

    // 히스토리 전체 삭제 함수/로컬도 삭제
    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem("qr_history");
    };

    // 로고 이미지 파일 업로드 처리 함수 : input onChange 이벤트의 타입을 지정 (React.ChangeEvent)
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // event.target.result는 string 또는 ArrayBuffer일 수 있으므로 string으로 단언
                // ArrayBuffer란?
                // 컴퓨터가 이해할 수 있는 0과 1로 이루어진 원시 이진 데이터(바이트 배열)를 다루기 위한 객체
                // 이미지, 오디오 같은 파일 데이터를 날것 그대로 메모리에 올려둘 때 사용
                setLogo(event.target?.result as string); // 이미지 파일을 읽어서 상태에 저장
            };
            reader.readAsDataURL(file);
        }
    };

    // 이미지 다운로드 처리 함수 : 매개변수 format의 타입을 위에 ImageFormat 유니언 타입으로 한정
    const downloadImage = async (format: ImageFormat) => {
        if (!qrRef.current) return;

        try {
            if (format === "svg") {
                // SVG 다운로드
                const svgElement = qrRef.current.querySelector("svg");
                if (svgElement) {
                    const svgData = new XMLSerializer().serializeToString(svgElement);
                    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
                    const svgUrl = URL.createObjectURL(svgBlob);

                    const downloadLink = document.createElement("a");
                    downloadLink.href = svgUrl;
                    downloadLink.download = `qrcode-${Date.now()}.svg`; //다운로드될 파일 이름을 지정
                    // 브라우저 화면(body)에 붙인 뒤, 자바스크립트로 강제 클릭(click())을 발생 (이때 다운로드가 실행됨)
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                }
            } else {
                // PNG, JPG 다운로드: html-to-image 라이브러리를 사용해 DOM 요소를 이미지로 렌더링
                const dataUrl =
                    format === "png"
                        ? await toPng(qrRef.current, { quality: 1.0, backgroundColor: bgColor })
                        : await toJpeg(qrRef.current, { quality: 1.0, backgroundColor: bgColor });

                const link = document.createElement("a");
                link.download = `qrcode-${Date.now()}.${format}`;
                link.href = dataUrl;
                link.click();
            }
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    // 색상 프리셋
    const presetColors = ["#000000", "#03C75A", "#FF4B4B", "#FF8A00", "#FFD600", "#00B8FF", "#2D5BFF", "#7C3AED"];

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
            {/* 상단 헤더 부분 */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-800">QR Maker</h1>
                    </div>
                </div>
            </header>

            {/* 메인 콘텐츠 영역 */}
            <main className="flex-grow max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* 왼쪽 패널 */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* 입력 콘텐츠 설정 */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                        1
                                    </div>
                                    <h2 className="text-lg font-semibold">Select Content Type</h2>
                                </div>
                                {/* URL / Text 선택 탭 */}
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {(["url", "text"] as QrType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setQrType(type)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                                qrType === type ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                            }`}
                                        >
                                            {type === "url" && <LinkIcon className="w-4 h-4" />}
                                            {type === "text" && <FileText className="w-4 h-4" />}
                                            <span className="capitalize">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 타입에 따른 입력 필드 노출 */}
                            <div className="space-y-4">
                                {qrType === "url" && (
                                    <div className="relative">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Website URL</label>
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="url를 입력해 주세요."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                )}
                                {qrType === "text" && (
                                    <div className="relative">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Plain Text</label>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            placeholder="텍스트를 입력해 주세요."
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.section>

                        {/* 디자인 커스터마이징 */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                        >
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm">
                                    2
                                </div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-slate-400" /> Customize QR Code
                                </h2>
                            </div>

                            <div className="space-y-8">
                                {/* 로고 업로드 영역 */}
                                <div>
                                    <label className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                                        <Layout className="w-4 h-4" /> Center Logo (Optional)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-6 py-3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4 rotate-180" />
                                            {logo ? "Change Logo" : "Upload Logo"}
                                        </button>
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        {logo && (
                                            <button onClick={() => setLogo(null)} className="text-xs text-red-500 font-bold">
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 색상 선택 영역 (전경색, 배경색) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {/* 전경색 선택기 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                                            <Palette className="w-4 h-4" /> Foreground Color
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {/* 프리셋 버튼 렌더링 */}
                                            {presetColors.map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setFgColor(color)}
                                                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${fgColor === color ? "border-slate-800 scale-110" : "border-transparent"}`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {fgColor === color && (
                                                        <Check className={`w-5 h-5 ${color === "#ffffff" ? "text-slate-800" : "text-white"}`} />
                                                    )}
                                                </button>
                                            ))}
                                            {/* 커스텀 컬러 피커 */}
                                            <div className="relative group">
                                                <input
                                                    type="color"
                                                    value={fgColor}
                                                    onChange={(e) => setFgColor(e.target.value)}
                                                    className="w-10 h-10 rounded-lg cursor-pointer opacity-0 absolute inset-0 z-10"
                                                />
                                                <div
                                                    className="w-10 h-10 rounded-lg border-2 border-slate-200 bg-white"
                                                    style={{ background: `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 배경색 선택기 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-slate-300" /> Background Color
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {["#ffffff", "#F8FAFC", "#F1F5F9", "#E2E8F0"].map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => setBgColor(color)}
                                                    className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${bgColor === color ? "border-slate-800 scale-110" : "border-slate-200"}`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {bgColor === color && <Check className="w-5 h-5 text-slate-800" />}
                                                </button>
                                            ))}
                                            <div className="relative group">
                                                <input
                                                    type="color"
                                                    value={bgColor}
                                                    onChange={(e) => setBgColor(e.target.value)}
                                                    className="w-10 h-10 rounded-lg cursor-pointer opacity-0 absolute inset-0 z-10"
                                                />
                                                <div
                                                    className="w-10 h-10 rounded-lg border-2 border-slate-200 bg-white"
                                                    style={{ background: `conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 크기 조절 & 에러 복원 수준 */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    {/* 크기 조절 슬라이더 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                                            <Maximize className="w-4 h-4" /> Size (px)
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="128"
                                                max="1024"
                                                step="8"
                                                value={size}
                                                onChange={(e) => setSize(Number(e.target.value))}
                                                className="flex-1 accent-blue-600"
                                            />
                                            <span className="text-sm font-mono font-bold bg-slate-100 px-3 py-1 rounded-md text-slate-700">
                                                {size}
                                            </span>
                                        </div>
                                    </div>
                                    {/* 에러 복원 수준 버튼 */}
                                    <div>
                                        <label className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                                            <Type className="w-4 h-4" /> Error Correction
                                        </label>
                                        <div className="flex gap-2">
                                            {(["L", "M", "Q", "H"] as ErrorCorrectionLevel[]).map((l) => (
                                                <button
                                                    key={l}
                                                    onClick={() => setLevel(l)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 ${level === l ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-100 text-slate-500"}`}
                                                >
                                                    {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.section>
                    </div>

                    {/* 오른쪽 패널: 뷰어 및 다운로드, 히스토리 */}
                    <div className="lg:col-span-4 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 sticky top-24"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                                    3
                                </div>
                                <h2 className="text-lg font-semibold">Preview</h2>
                            </div>

                            {/* QR 코드 실시간 미리보기 영역 */}
                            <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center p-8 mb-8 border border-slate-100 overflow-hidden">
                                <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-lg" style={{ backgroundColor: bgColor }}>
                                    {/* 실제 화면에 그려지는 SVG 요소 */}
                                    <QRCodeSVG
                                        value={getQRValue()}
                                        size={204} // 미리보기를 위한 고정 크기
                                        fgColor={fgColor}
                                        bgColor={bgColor}
                                        level={level}
                                        includeMargin={false}
                                        className="w-full h-full"
                                        imageSettings={
                                            logo
                                                ? { src: logo, height: (logoSize / size) * 204, width: (logoSize / size) * 204, excavate: true }
                                                : undefined
                                        }
                                    />
                                </div>
                            </div>

                            {/* 다운로드 버튼 그룹 */}
                            <div className="space-y-3">
                                {/* PNG 다운로드 */}
                                <button
                                    onClick={() => {
                                        addToHistory();
                                        downloadImage("png");
                                    }}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download PNG
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* JPG, SVG 다운로드 */}
                                    <button
                                        onClick={() => {
                                            addToHistory();
                                            downloadImage("jpg");
                                        }}
                                        className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2"
                                    >
                                        JPG
                                    </button>
                                    <button
                                        onClick={() => {
                                            addToHistory();
                                            downloadImage("svg");
                                        }}
                                        className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-2"
                                    >
                                        SVG
                                    </button>
                                </div>
                            </div>
                        </motion.div>

                        {/* 최근 방문 기록 (History) 섹션 */}
                        <AnimatePresence>
                            {history.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <History className="w-5 h-5 text-slate-400" /> Recent History
                                        </h2>
                                        <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                                            <Trash2 className="w-3 h-3" /> Clear
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {/* 생성했던 QR 코드 목록 매핑 */}
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200 shrink-0">
                                                        {item.type === "url" && <LinkIcon className="w-4 h-4 text-blue-500" />}
                                                        {item.type === "text" && <FileText className="w-4 h-4 text-emerald-500" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-sm font-medium text-slate-700 truncate">{item.value}</p>
                                                        <p className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                </div>
                                                {/* 내역 복구 버튼 (클릭 시 입력창에 다시 세팅됨) */}
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            if (item.type === "url") setUrl(item.value);
                                                            if (item.type === "text") setText(item.value);
                                                            setQrType(item.type);
                                                        }}
                                                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>

            {/* 하단 푸터 영역 */}
            <footer className="mt-20 py-12 border-t border-slate-200 bg-white">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <p className="text-slate-400 text-sm">QR Code Tool. No login.</p>
                </div>
            </footer>
        </div>
    );
}
