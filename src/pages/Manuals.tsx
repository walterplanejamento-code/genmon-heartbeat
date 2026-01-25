import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, Eye, Download } from "lucide-react";
import { useState, useRef } from "react";

interface Manual {
  id: string;
  fileName: string;
  modelo: string;
  uploadedAt: string;
  size: string;
}

const mockManuals: Manual[] = [
  {
    id: "1",
    fileName: "Manual_MWM_D229-4.pdf",
    modelo: "MWM D229-4",
    uploadedAt: "2024-01-10",
    size: "2.4 MB",
  },
  {
    id: "2",
    fileName: "K30XL_Parametrizacao.pdf",
    modelo: "STEMAC K30XL",
    uploadedAt: "2024-01-08",
    size: "1.8 MB",
  },
];

export default function Manuals() {
  const [manuals, setManuals] = useState<Manual[]>(mockManuals);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      if (file.type === "application/pdf") {
        const newManual: Manual = {
          id: Date.now().toString(),
          fileName: file.name,
          modelo: "Identificando...",
          uploadedAt: new Date().toISOString().split("T")[0],
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        };
        setManuals((prev) => [...prev, newManual]);
        
        // Simulate AI identification
        setTimeout(() => {
          setManuals((prev) =>
            prev.map((m) =>
              m.id === newManual.id
                ? { ...m, modelo: "MWM D229-4 (identificado)" }
                : m
            )
          );
        }, 2000);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeManual = (id: string) => {
    setManuals(manuals.filter((m) => m.id !== id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manuais do Gerador</h1>
          <p className="text-muted-foreground">
            Faça upload de manuais PDF para identificação automática de parâmetros
          </p>
        </div>

        {/* Upload area */}
        <div
          className={`industrial-card border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-medium text-foreground mb-2">
            Arraste arquivos PDF aqui
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            ou clique para selecionar arquivos
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Selecionar PDF
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            O sistema identifica automaticamente o modelo do gerador e associa os parâmetros
          </p>
        </div>

        {/* Manual list */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Manuais Carregados
          </h2>
          
          {manuals.length > 0 ? (
            <div className="space-y-3">
              {manuals.map((manual) => (
                <div key={manual.id} className="industrial-card p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-data-red/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-data-red" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">
                        {manual.fileName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-primary font-medium">
                          {manual.modelo}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {manual.size}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {manual.uploadedAt}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-data-red"
                        onClick={() => removeManual(manual.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="industrial-card p-8 text-center text-muted-foreground">
              Nenhum manual carregado
            </div>
          )}
        </div>

        {/* Info */}
        <div className="industrial-card p-4 bg-primary/5 border-primary/20">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Como funciona a identificação automática
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• O sistema analisa o conteúdo do PDF para identificar o modelo do equipamento</li>
            <li>• Parâmetros técnicos são extraídos e associados ao gerador</li>
            <li>• Limites de alerta são sugeridos com base nas especificações do manual</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
