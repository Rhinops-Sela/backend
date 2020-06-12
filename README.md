[![Build Status](https://dev.azure.com/Rhinops-Sela/k8s-bootstrapper/_apis/build/status/Rhinops-Sela.backend?branchName=master)](https://dev.azure.com/Rhinops-Sela/k8s-bootstrapper/_build/latest?definitionId=3&branchName=master)

# backend

Required variables:
RUNNING_PORT: (default=3000)
LOG_LEVEL: (default=0 -> INFO)
FORM_TEMPLATE_FILE
AWS_ACCESS_KEY
AWS_SECRET_KEY
AWS_REGION
AWS_FORMAT
COMPONENTS_ROOT


build prod: npm run build
output: dist,package.json,node_modules