from setuptools import find_packages, setup

setup(
    name="em-compliance-analyzer",
    version="0.1.0",
    description="EM-DataSystem local specification analyzer",
    packages=find_packages(),
    python_requires=">=3.11",
    install_requires=["pypdf>=5.1,<6"],
)
