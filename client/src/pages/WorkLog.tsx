import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useMessages } from "@/hooks/use-messages";
import { useLanguageStore, translations } from "@/lib/i18n";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";

export default function WorkLog() {
  const { language } = useLanguageStore();
  const t = translations[language].worklog;
  const { data: messages = [], isLoading, refetch } = useMessages();

  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { 
        locale: language === 'ru' ? ru : enUS 
      });
    } catch {
      return dateStr;
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    refetch();
  };

  const buildWorkDescription = (msg: typeof messages[0]) => {
    const data = msg.normalizedData;
    if (!msg.isProcessed || !data) {
      return msg.messageRaw || "";
    }
    
    let description = data.workDescription || msg.messageRaw || "";
    
    const materials: string[] = [];
    if (data.materials && Array.isArray(data.materials)) {
      materials.push(...data.materials);
    }
    
    if (materials.length > 0) {
      description += ` — ${materials.join("; ")}`;
    }
    
    return description;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background bg-grain">
      <Header title={t.title} />
      
      <ScrollArea className="flex-1 px-2 py-2 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-2">
            <p className="text-sm text-muted-foreground leading-tight max-w-[70%]">
              {t.subtitle}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="shrink-0"
              data-testid="button-refresh-log"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.refreshLog}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="text-center py-16 opacity-60">
              <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t.noRecords}</h3>
              <p className="text-sm text-muted-foreground">{t.noRecordsHint}</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-blue-400 rounded-sm">
              <table className="w-full border-collapse text-sm" data-testid="worklog-table">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-950/30">
                    <th className="border border-blue-300 dark:border-blue-700 px-2 py-2 text-xs font-normal text-center align-top w-12">
                      {t.rowNumber}
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-2 py-2 text-xs font-normal text-center align-top w-24">
                      {t.date}
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-2 py-2 text-xs font-normal text-center align-top w-20">
                      {t.workConditions}
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-2 py-2 text-xs font-normal text-center italic">
                      {t.workDescription}
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-2 py-2 text-xs font-normal text-center italic w-36">
                      {t.representative}
                    </th>
                  </tr>
                  <tr className="bg-blue-50 dark:bg-blue-950/30">
                    <th className="border border-blue-300 dark:border-blue-700 px-1 py-1 text-xs font-normal text-center">
                      1
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-1 py-1 text-xs font-normal text-center">
                      2
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-1 py-1 text-xs font-normal text-center">
                      3
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-1 py-1 text-xs font-normal text-center">
                      4
                    </th>
                    <th className="border border-blue-300 dark:border-blue-700 px-1 py-1 text-xs font-normal text-center">
                      5
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMessages.map((msg, idx) => {
                    const isPending = !msg.isProcessed;
                    const data = msg.normalizedData;
                    return (
                      <tr 
                        key={msg.id} 
                        className={cn(
                          "hover:bg-muted/30 transition-colors",
                          isPending && "opacity-70 bg-yellow-50/30 dark:bg-yellow-900/10"
                        )}
                        data-testid={`worklog-row-${msg.id}`}
                      >
                        <td className="border border-blue-300 dark:border-blue-700 px-2 py-3 text-center align-top">
                          {idx + 1}
                        </td>
                        <td className="border border-blue-300 dark:border-blue-700 px-2 py-3 text-center align-top whitespace-nowrap">
                          {formatDate(data?.date || msg.createdAt?.toString())}
                        </td>
                        <td className="border border-blue-300 dark:border-blue-700 px-2 py-3 text-center align-top">
                          {data?.workConditions || ""}
                        </td>
                        <td className="border border-blue-300 dark:border-blue-700 px-3 py-3 align-top">
                          <div className={cn(isPending && "italic text-muted-foreground")}>
                            {buildWorkDescription(msg)}
                          </div>
                        </td>
                        <td className="border border-blue-300 dark:border-blue-700 px-2 py-3 text-center align-top">
                          {data?.representative || ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollArea>

      <BottomNav />
    </div>
  );
}
