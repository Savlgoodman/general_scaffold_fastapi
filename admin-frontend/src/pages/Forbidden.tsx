import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export default function Forbidden() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <ShieldX className="size-16 text-destructive" />
      <h1 className="text-2xl font-bold">403 - 无权限访问</h1>
      <p className="text-muted-foreground">您没有权限访问此页面，请联系管理员</p>
      <Button onClick={() => navigate("/")} variant="outline">
        返回首页
      </Button>
    </div>
  )
}
