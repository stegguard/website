# Build with the modified StegGuard checkout as the named context "detector".
FROM python:3.12-slim
COPY --from=detector /pyproject.toml /README.md /LICENSE /tmp/package/
COPY --from=detector /stegguard /tmp/package/stegguard
RUN pip install --no-cache-dir gunicorn==27.0.1 /tmp/package && rm -rf /tmp/package
WORKDIR /srv
COPY app.py .
RUN mkdir /run/scan && chown 65532:65532 /run/scan
USER 65532:65532
CMD ["gunicorn","--bind","unix:/run/scan/api.sock","--workers","2","--timeout","5","--backlog","8","--worker-tmp-dir","/tmp","app:application"]
