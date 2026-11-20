import http.client
import os
import threading
import unittest
from unittest.mock import patch
from wsgiref.simple_server import make_server, WSGIRequestHandler
import json

from app import application, MAX_BYTES


class QuietHandler(WSGIRequestHandler):
    def log_message(self, *args):
        pass


class ScanHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server("127.0.0.1", 0, application, handler_class=QuietHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.thread.join()
        cls.server.server_close()

    def request(self, body, expected, **headers):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_port)
        with patch.dict(os.environ, SCAN_ORIGIN="https://example.test"):
            conn.request("POST", "/api/scan", body=body, headers={
                "Content-Type": "text/plain;charset=utf-8", "Origin": "https://example.test",
                "X-Stegguard-Scan": "1", **headers,
            })
            response = conn.getresponse()
            self.assertEqual(response.status, expected)
            self.assertEqual(response.getheader("Cache-Control"), "no-store")
            report = json.loads(response.read())
        conn.close()
        return report

    def test_signature_stays_text_and_no_input_is_echoed(self):
        report = self.request("%PDF- example\u200b".encode(), 200)
        self.assertEqual(report, {"complete": True, "findings": ["Line 1, column 14: U+200B (zero width)."]})

    def test_boundary(self):
        self.assertEqual(self.request(b"x" * MAX_BYTES, 200), {"complete": True, "findings": []})
        self.request(b"x" * (MAX_BYTES + 1), 413)

    def test_rejections(self):
        self.request(b"", 400)
        self.request(b"\xff", 400)
        self.request(b"\0", 422)
        self.request(b"x", 403, Origin="https://other.test")
        self.request(b"x", 403, **{"X-Stegguard-Scan": ""})
        self.request(b"x", 415, **{"Content-Type": "application/json"})
        self.request(b"x", 415, **{"Content-Encoding": "gzip"})

    def test_findings_limit(self):
        report = self.request(("\u200b" * 101).encode(), 200)
        self.assertFalse(report["complete"])
        self.assertEqual(len(report["findings"]), 100)
