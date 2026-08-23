type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
};

export default function handler(_req: unknown, res: Res) {
  res.status(200).json({
    status: 'ok',
    service: 'gyeonggi-on-api',
    nts: Boolean(String(process.env.NTS_SERVICE_KEY ?? '').trim()),
  });
}
