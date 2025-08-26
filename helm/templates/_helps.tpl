{{- define "bin-collection-service.name" -}}
bin-collection-service
{{- end }}

{{- define "bin-collection-service.fullname" -}}
{{ include "bin-collection-service.name" . }}
{{- end }}