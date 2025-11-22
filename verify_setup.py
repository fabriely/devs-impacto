"""Verify that the Python environment and project structure are set up correctly."""
import sys
from pathlib import Path


def check_directories():
    """Check that all required directories exist."""
    required_dirs = [
        "src/api",
        "src/core",
        "src/models",
        "src/dashboard",
        "src/utils",
        "tests/unit",
        "tests/property",
        "tests/integration",
        "data",
    ]
    
    missing = []
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            missing.append(dir_path)
    
    if missing:
        print(f"❌ Missing directories: {', '.join(missing)}")
        return False
    
    print("✅ All required directories exist")
    return True


def check_dependencies():
    """Check that all core dependencies can be imported."""
    dependencies = [
        "fastapi",
        "sqlalchemy",
        "hypothesis",
        "pytest",
        "streamlit",
        "openai",
        "pandas",
        "uvicorn",
        "pydantic",
        "cryptography",
    ]
    
    missing = []
    for dep in dependencies:
        try:
            __import__(dep)
        except ImportError:
            missing.append(dep)
    
    if missing:
        print(f"❌ Missing dependencies: {', '.join(missing)}")
        return False
    
    print("✅ All core dependencies are installed")
    return True


def check_files():
    """Check that all required configuration files exist."""
    required_files = [
        ".env.example",
        "requirements.txt",
        "pytest.ini",
        "README-pipeline.md",
    ]
    
    missing = []
    for file_path in required_files:
        if not Path(file_path).exists():
            missing.append(file_path)
    
    if missing:
        print(f"❌ Missing files: {', '.join(missing)}")
        return False
    
    print("✅ All required configuration files exist")
    return True


def main():
    """Run all verification checks."""
    print("🔍 Verifying Voz.Local Pipeline setup...\n")
    
    checks = [
        check_directories(),
        check_dependencies(),
        check_files(),
    ]
    
    if all(checks):
        print("\n✅ Setup verification complete! Environment is ready.")
        return 0
    else:
        print("\n❌ Setup verification failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
