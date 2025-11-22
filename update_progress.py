"""Script para atualizar automaticamente o documento de progresso."""
from datetime import datetime
from pathlib import Path


def update_progress(task_number: int, task_name: str, status: str, details: dict = None):
    """
    Atualiza o documento de progresso com informações da task.
    
    Args:
        task_number: Número da task (1-14)
        task_name: Nome da task
        status: Status da task ('completed', 'in_progress', 'pending')
        details: Dicionário com detalhes adicionais da implementação
    """
    progress_file = Path(".kiro/specs/voz-local-pipeline/PROGRESS.md")
    
    if not progress_file.exists():
        print(f"❌ Arquivo de progresso não encontrado: {progress_file}")
        return
    
    # Ler conteúdo atual
    content = progress_file.read_text(encoding="utf-8")
    
    # Atualizar timestamp
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    content = content.replace(
        "**Última atualização:**",
        f"**Última atualização:** {now}"
    )
    
    # Calcular progresso
    total_tasks = 14
    completed_count = content.count("**Status:** ✅ Completada")
    progress_percent = int((completed_count / total_tasks) * 100)
    
    # Atualizar contadores
    lines = content.split("\n")
    for i, line in enumerate(lines):
        if "**Tasks completadas:**" in line:
            lines[i] = f"- **Tasks completadas:** {completed_count}/{total_tasks}"
        elif "**Progresso:**" in line:
            lines[i] = f"- **Progresso:** {progress_percent}%"
    
    content = "\n".join(lines)
    
    # Salvar
    progress_file.write_text(content, encoding="utf-8")
    
    print(f"✅ Progresso atualizado: Task {task_number} - {status}")
    print(f"📊 Progresso geral: {completed_count}/{total_tasks} ({progress_percent}%)")


def add_task_completion(task_number: int, task_name: str, implementation_details: list):
    """
    Adiciona uma task completada ao documento de progresso.
    
    Args:
        task_number: Número da task
        task_name: Nome da task
        implementation_details: Lista de detalhes da implementação
    """
    progress_file = Path(".kiro/specs/voz-local-pipeline/PROGRESS.md")
    content = progress_file.read_text(encoding="utf-8")
    
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    # Criar entrada da task
    task_entry = f"""
### Task {task_number}: {task_name}
**Status:** ✅ Completada  
**Data de conclusão:** {now}  
**Descrição:** Task completada com sucesso

**Detalhes da implementação:**
"""
    
    for detail in implementation_details:
        task_entry += f"- ✅ {detail}\n"
    
    task_entry += "\n---\n"
    
    # Inserir antes da seção "Tasks em Progresso"
    marker = "## Tasks em Progresso 🔄"
    content = content.replace(marker, task_entry + marker)
    
    # Atualizar
    progress_file.write_text(content, encoding="utf-8")
    update_progress(task_number, task_name, "completed")


if __name__ == "__main__":
    print("📝 Script de atualização de progresso")
    print("Use as funções update_progress() ou add_task_completion() no seu código")
